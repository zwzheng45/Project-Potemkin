package main

import (
	"crypto/rand"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/unibaseio/da-sdk-go/sdk"
)

var remoteURL = sdk.DefaultServerURL
var privateKey = os.Getenv("PRIVATE_KEY")

func main() {
	// 创建客户端
	client, err := sdk.NewClient(remoteURL, privateKey, sdk.DefaultChainType) // 空字符串表示自动生成私钥
	if err != nil {
		log.Fatalf("创建客户端失败: %v", err)
	}

	// 上传示例
	fmt.Println("=== 上传示例 ===")

	// random create and fill testfile
	filename := "test-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	testfile := "/tmp/" + filename
	if _, err := os.Stat(testfile); os.IsNotExist(err) {
		f, err := os.Create(testfile)
		if err != nil {
			log.Fatalf("创建测试文件失败: %v", err)
		}
		defer f.Close()

		// 写入一些随机数据
		randData := make([]byte, 1024)
		rand.Read(randData)
		f.Write(randData)
	}

	// 使用默认配置上传文件
	uploadConfig := sdk.DefaultUploadConfig()
	uploadConfig.CustomFileName = filename
	result, err := client.Upload(testfile, uploadConfig)
	if err != nil {
		log.Fatalf("上传失败: %v", err)
	}

	fmt.Printf("上传成功:\n")
	fmt.Printf("  哈希: %s\n", result.Hash)
	fmt.Printf("  名称: %s\n", result.Name)
	fmt.Printf("  流媒体: %s\n", result.Streamer)

	// 下载示例
	fmt.Println("\n=== 下载示例 ===")

	// Download dir
	downloadDir := "/tmp/downloaded"
	if _, err := os.Stat(downloadDir); os.IsNotExist(err) {
		err := os.MkdirAll(downloadDir, 0755)
		if err != nil {
			log.Fatalf("创建下载目录失败: %v", err)
		}
	}
	// 使用默认配置下载
	err = client.Download(result.Name, downloadDir, sdk.DefaultDownloadConfig())
	if err != nil {
		log.Fatalf("下载失败: %v", err)
	}

	fmt.Println("下载成功")

	// 自定义配置下载
	customDownloadConfig := &sdk.DownloadConfig{
		ParallelWorkers: 8,
		CacheDirectory:  "/tmp/my-cache",
	}

	err = client.Download(result.Name, downloadDir, customDownloadConfig)
	if err != nil {
		log.Fatalf("自定义下载失败: %v", err)
	}

	fmt.Println("自定义下载成功")
}
