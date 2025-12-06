# DA SDK Go

Unibase DA的Go SDK。

## 安装

```bash
go get github.com/unibaseio/da-sdk-go
```

## 使用

```go
package main

import (
    "fmt"
    "log"
    "github.com/unibaseio/da-sdk-go/sdk"
)

func main() {
    // 创建客户端，指定URL和私钥
    client, err := sdk.NewClient(
        "https://testnet.gateway.membase.io/", 
        "your-private-key-hex-string",
        sdk.DefaultChainType,
    )
    if err != nil {
        log.Fatal(err)
    }
    
    // 上传文件
    result, err := client.Upload("./file.txt", sdk.DefaultUploadConfig())
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Hash: %s, Name: %s\n", result.Hash, result.Name)
    
    // 下载文件
    err = client.Download(result.Name, "./downloaded.txt", sdk.DefaultDownloadConfig())
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Println("完成")
}
```

参数说明：
- 第一个参数为空字符串时使用默认URL
- 第二个参数为空字符串时自动生成私钥
- 第三个参数为空字符串时使用默认链类型
