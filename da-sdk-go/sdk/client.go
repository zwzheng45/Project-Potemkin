package sdk

import (
	"crypto/ecdsa"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"

	"github.com/MOSSV2/dimo-sdk-go/build"
	"github.com/MOSSV2/dimo-sdk-go/contract"
	"github.com/MOSSV2/dimo-sdk-go/lib/key"
	"github.com/MOSSV2/dimo-sdk-go/lib/kv"
	"github.com/MOSSV2/dimo-sdk-go/lib/piece"
	"github.com/MOSSV2/dimo-sdk-go/lib/simplefs"
	"github.com/MOSSV2/dimo-sdk-go/lib/types"
	"github.com/MOSSV2/dimo-sdk-go/sdk"

	darchive "github.com/docker/docker/pkg/archive"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/mitchellh/go-homedir"
)

const DefaultChainType = build.BNBTestnet
const DefaultServerURL = build.ServerURL

// Client DA SDK客户端
type Client struct {
	RemoteURL  string            // 远程服务器URL
	PrivateKey *ecdsa.PrivateKey // 私钥字符串，如果为空则自动生成
}

// UploadConfig 上传配置
type UploadConfig struct {
	ReedSolomonN   int    // Reed-Solomon N参数（总分片数）
	ReedSolomonK   int    // Reed-Solomon K参数（数据分片数）
	EnableTAR      bool   // 是否压缩目录为tar.gz
	CustomFileName string // 文件在公共存储中的名称，默认使用sha256
}

// DownloadConfig 下载配置
type DownloadConfig struct {
	ParallelWorkers int    // 并行下载数
	EnableUntar     bool   // 是否解压tar文件
	CacheDirectory  string // 缓存目录，默认为~/.dimocache
}

// UploadResult 上传结果
type UploadResult struct {
	Hash     string // 文件哈希
	Name     string // 文件名
	Streamer string // 流媒体地址
}

// NewClient 创建新的DA SDK客户端
func NewClient(remoteURL, privateKey, chaintype string) (*Client, error) {
	if remoteURL == "" {
		remoteURL = DefaultServerURL
	}

	if chaintype == "" {
		chaintype = DefaultChainType
	}

	sdk.ChainType = chaintype
	sdk.CheckENV()

	var sk *ecdsa.PrivateKey
	var err error
	if privateKey == "" {
		sk, err = crypto.GenerateKey()
		if err != nil {
			return nil, err
		}
		skbyte := crypto.FromECDSA(sk)
		fmt.Printf("=== generate privatekey: %s ===\n", hex.EncodeToString(skbyte))
	} else {
		sk, err = crypto.HexToECDSA(privateKey)
		if err != nil {
			return nil, err
		}
	}

	return &Client{
		RemoteURL:  remoteURL,
		PrivateKey: sk,
	}, nil
}

// DefaultUploadConfig 返回默认的上传配置
func DefaultUploadConfig() *UploadConfig {
	return &UploadConfig{
		ReedSolomonN:   6,
		ReedSolomonK:   4,
		EnableTAR:      true,
		CustomFileName: "", // 使用sha256
	}
}

// DefaultDownloadConfig 返回默认的下载配置
func DefaultDownloadConfig() *DownloadConfig {
	return &DownloadConfig{
		ParallelWorkers: 4,
		EnableUntar:     false,
		CacheDirectory:  "", // 使用默认缓存目录
	}
}

// Upload 上传文件或目录
func (c *Client) Upload(filePath string, config *UploadConfig) (*UploadResult, error) {
	if config == nil {
		config = DefaultUploadConfig()
	}

	// 展开文件路径
	fp, err := homedir.Expand(filePath)
	if err != nil {
		return nil, err
	}

	// 构建认证
	au, err := key.BuildAuth(c.PrivateKey, []byte("upload"))
	if err != nil {
		return nil, err
	}

	// 登录
	sdk.Login(c.RemoteURL, au)

	// 检查链和余额
	os.Setenv("CHAIN_TYPE", build.BNBTestnet)
	chainType := build.CheckChain()
	cm, err := contract.NewContractManage(c.PrivateKey, chainType)
	if err != nil {
		return nil, err
	}

	err = cm.CheckBalance(au.Addr)
	if err != nil {
		return nil, err
	}

	// 检查文件信息
	fi, err := os.Stat(fp)
	if err != nil {
		return nil, err
	}

	// 设置策略
	policy := types.Policy{
		N: uint8(config.ReedSolomonN),
		K: uint8(config.ReedSolomonK),
	}

	err = policy.Check()
	if err != nil {
		return nil, err
	}

	// 上传单个文件或压缩目录
	if !fi.IsDir() || config.EnableTAR {
		return c.uploadSingleFile(c.RemoteURL, au, policy, fp, config.CustomFileName, cm)
	}

	// 上传目录中的所有文件
	return c.uploadDirectory(c.RemoteURL, au, policy, fp, cm)
}

// uploadSingleFile 上传单个文件
func (c *Client) uploadSingleFile(url string, au types.Auth, policy types.Policy, filePath, name string, cm *contract.ContractManage) (*UploadResult, error) {
	res, streamer, err := sdk.Upload(url, au, policy, filePath, name)
	if err != nil {
		return nil, err
	}

	pcs, err := sdk.CheckFileFull(res, streamer, filePath)
	if err != nil {
		return nil, err
	}

	fmt.Printf("upload %s to %s, sha256: %s\n", filePath, streamer.String(), res.Hash)
	fmt.Printf("submit %s to chain\n", res.Name)

	// 提交元数据到链
	for _, pc := range pcs {
		_, err = cm.AddPiece(pc)
		if err != nil {
			return nil, err
		}
	}

	return &UploadResult{
		Hash:     res.Hash,
		Name:     res.Name,
		Streamer: streamer.String(),
	}, nil
}

// uploadDirectory 上传目录中的所有文件
func (c *Client) uploadDirectory(url string, au types.Auth, policy types.Policy, dirPath string, cm *contract.ContractManage) (*UploadResult, error) {
	var lastResult *UploadResult

	err := filepath.Walk(dirPath, func(fileName string, fi os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if fi.IsDir() {
			return nil
		}

		res, streamer, err := sdk.Upload(url, au, policy, fileName, "")
		if err != nil {
			return err
		}

		pcs, err := sdk.CheckFileFull(res, streamer, fileName)
		if err != nil {
			return err
		}

		fmt.Printf("upload %s to %s, sha256: %s\n", fileName, streamer.String(), res.Hash)
		fmt.Printf("submit %s to chain\n", res.Name)

		// 提交元数据到链
		for _, pc := range pcs {
			_, err = cm.AddPiece(pc)
			if err != nil {
				return err
			}
		}

		lastResult = &UploadResult{
			Hash:     res.Hash,
			Name:     res.Name,
			Streamer: streamer.String(),
		}
		return nil
	})

	return lastResult, err
}

// Download 下载文件
func (c *Client) Download(fileName, savePath string, config *DownloadConfig) error {
	if config == nil {
		config = DefaultDownloadConfig()
	}

	// 构建认证
	au, err := key.BuildAuth(c.PrivateKey, []byte("download"))
	if err != nil {
		return err
	}

	// 设置缓存存储
	var ks types.IPieceStore
	if config.ParallelWorkers > 0 {
		cacheDir := config.CacheDirectory
		if cacheDir == "" {
			cacheDir, _ = homedir.Expand("~/.dimocache")
		}

		err := os.MkdirAll(cacheDir, 0755)
		if err != nil {
			return err
		}
		fmt.Printf("use local dir %s as cache\n", cacheDir)

		ds, err := kv.NewBadgerStore(path.Join(cacheDir, "meta"), nil)
		if err != nil {
			return err
		}

		fs, err := simplefs.New(path.Join(cacheDir, "data"))
		if err != nil {
			return err
		}

		ks = piece.New(ds, fs)
	}

	// 如果需要解压
	if config.EnableUntar {
		return c.downloadAndUntar(c.RemoteURL, au, fileName, savePath, config.ParallelWorkers, ks)
	}

	// 普通下载
	return c.downloadFile(c.RemoteURL, au, fileName, savePath, config.ParallelWorkers, ks)
}

// downloadAndUntar 下载并解压文件
func (c *Client) downloadAndUntar(url string, au types.Auth, fileName, savePath string, parallel int, ks types.IPieceStore) error {
	err := os.MkdirAll(savePath, 0755)
	if err != nil {
		return err
	}

	ipr, ipw := io.Pipe()
	go func() {
		defer ipw.Close()
		err := sdk.DownloadParallel(url, au, fileName, parallel, ks, ipw)
		if err != nil {
			fmt.Println(err)
		}
	}()

	err = darchive.Untar(ipr, savePath, &darchive.TarOptions{
		Compression: darchive.Gzip,
		NoLchown:    true,
	})
	if err != nil {
		return err
	}

	fmt.Printf("download and untar %s to dir: %s\n", fileName, savePath)
	return nil
}

// downloadFile 下载文件
func (c *Client) downloadFile(url string, au types.Auth, fileName, savePath string, parallel int, ks types.IPieceStore) error {
	os.MkdirAll(savePath, 0755)
	filePath := path.Join(savePath, fileName)
	fi, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer fi.Close()

	h := sha256.New()
	w := io.MultiWriter(fi, h)
	err = sdk.DownloadParallel(url, au, fileName, parallel, ks, w)
	if err != nil {
		return err
	}

	if hex.EncodeToString(h.Sum(nil)) != fileName {
		fmt.Printf("file sha256: %s\n", hex.EncodeToString(h.Sum(nil)))
	}

	fmt.Printf("download %s to : %s\n", fileName, savePath)
	return nil
}
