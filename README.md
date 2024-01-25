# 阿里云证书自动更新

主要用于阿里云函数计算自定义域名的https证书自动更新。

## 使用方法

```shell
# 下载代码
git clone git@github.com:ianzhi/aliyun-cert-renew.git

# 安装依赖
cd aliyun-cert-renew && npm install

# 按照实际信息修改配置
# 在src/index.js文件中修改需要更新证书的域名
cp s.yaml.sample s.yaml

# 部署代码
npm run deploys
```