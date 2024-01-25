const $Util = require('@alicloud/tea-util')
const $OpenApi = require('@alicloud/openapi-client')
const $FC_Open20210406 = require('@alicloud/fc-open20210406')
const $cas20200407 = require('@alicloud/cas20200407')

class FunctionComputeCertRenew {
    constructor(key_id, key_secret) {
        this.client = this.createClient(key_id, key_secret)

        this.cas = this.createCASClient(key_id, key_secret)
    }

    createCASClient(accessKeyId, accessKeySecret) {
        let config = new $OpenApi.Config({
            accessKeyId: accessKeyId,
            accessKeySecret: accessKeySecret,
        });
        config.endpoint = `cas.aliyuncs.com`;
        return new $cas20200407.default(config);
    }

    createClient(accessKeyId, accessKeySecret) {
        let config = new $OpenApi.Config({
            accessKeyId: accessKeyId,
            accessKeySecret: accessKeySecret,
        });
        // Endpoint 请参考 https://api.aliyun.com/product/Cdn
        config.endpoint = `1715373259194086.cn-hangzhou.fc.aliyuncs.com`;
        return new $FC_Open20210406.default(config);
    }

    async checkDomainCert(domain) {
        const fcDomain = await this.getFunctionComputeDomain(domain)
        if (fcDomain === undefined) {
            throw new Error(`函数计算中找不到给定的域名: ${domain}`)
        }
        console.info(`FC域名: ${domain}, 当前证书名称: ${fcDomain.certConfig.certName}`)

        // 获取当前证书信息
        const cert = await this.getCertInfo(domain, fcDomain.certConfig.certName)
        const now = new Date()
        if (cert !== undefined) {
            console.info(`当前证书ID: ${cert.certificateId}, 过期日期：${cert.endDate}`)

            // 检查过期日期endDate, 过期时间距离现在小于5天时更新证书
            const expireDate = new Date(cert.endDate)
            const days = ((expireDate.getTime() - now.getTime()) / 86400000).toFixed(2)
            if (days > 5) {
                console.info(`距离下次更新还有${days}天，暂不续期`)
                return
            }
        }

        await this.refreshCert(domain, now)
    }

    // 更新证书
    async refreshCert(domain, now) {
        console.info('开始更新证书...')

        // 生成证书
        const orderID = await this.createCert()
        console.info('创建证书:', orderID)

        // 获取订单状态
        const status = await this.checkOrderStatus(orderID)
        console.info(`证书验证完成，开始部署证书...`)

        // 部署证书
        await this.deployCert(`${domain}-${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`, domain, status.certificate, status.privateKey)
        console.info('证书更新成功!')
    }

    async deployCert(certName, domain, certificate, privateKey) {
        let updateCustomDomainHeaders = new $FC_Open20210406.UpdateCustomDomainHeaders({});
        let certConfig = new $FC_Open20210406.CertConfig({
            certName,
            certificate,
            privateKey,
        });
        let updateCustomDomainRequest = new $FC_Open20210406.UpdateCustomDomainRequest({
            certConfig: certConfig,
        });
        let runtime = new $Util.RuntimeOptions({});
        try {
            // 复制代码运行请自行打印 API 的返回值
            const result = await this.client.updateCustomDomainWithOptions(domain, updateCustomDomainRequest, updateCustomDomainHeaders, runtime);
            return result.body
        } catch (error) {
            // 错误 message
            console.log(error.message);
            // 诊断地址
            console.log(error.data["Recommend"]);
            $Util.default.assertAsString(error.message);
        }
    }

    async checkOrderStatus(orderID, times = 0) {
        if (times > 10) {
            return new Error('证书无法验证，请手动检查问题原因')
        }

        let status = await this.getOrderStatus(orderID)
        console.info(`第${times + 1}次检查订单状态：`, status.type)

        if (status.type === 'certificate') {
            return status
        } else {
            await this.delay(1.5)
            return await this.getOrderStatus(orderID, times + 1)
        }
    }

    async getFunctionComputeDomain(domain) {
        let runtime = new $Util.RuntimeOptions({});
        let headers = {};
        try {
            // 复制代码运行请自行打印 API 的返回值
            const result = await this.client.getCustomDomainWithOptions(domain, headers, runtime);

            return result.body
        } catch (error) {
            // 错误 message
            console.log(error.message);
            // 诊断地址
            console.log(error.data["Recommend"]);
            // 代表获取失败
            return undefined
        }
    }

    async delay(time) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve()
            }, time * 100)
        })
    }

    async getOrderStatus(orderID) {
        let describeCertificateStateRequest = new $cas20200407.DescribeCertificateStateRequest({
            orderId: orderID,
        });
        let runtime = new $Util.RuntimeOptions({});
        try {
            // 复制代码运行请自行打印 API 的返回值
            const data = await this.cas.describeCertificateStateWithOptions(describeCertificateStateRequest, runtime);

            return data.body
        } catch (error) {
            // 错误 message
            console.log(error.message);
            // 诊断地址
            console.log(error.data["Recommend"]);
            $Util.default.assertAsString(error.message);
            return undefined
        }
    }

    async verifyOrder(orderID, status) {
        if (status.validateType === 'FILE') {
            await this.writeValidateFile(status.domain, status.uri, status.content)
        }
        //  else if (status.validateType === 'DNS') {
        //     await this.validateByDNS()
        // }
    }

    async createCert() {
        let createCertificateForPackageRequestRequest = new $cas20200407.CreateCertificateForPackageRequestRequest({
            domain: "www.dnote.cn",
            validateType: "DNS"
        });
        let runtime = new $Util.RuntimeOptions({});
        try {
            // 复制代码运行请自行打印 API 的返回值
            const data = await this.cas.createCertificateForPackageRequestWithOptions(createCertificateForPackageRequestRequest, runtime);

            return data.body.orderId
        } catch (error) {
            // 错误 message
            console.log(error.message);
            // 诊断地址
            console.log(error.data["Recommend"]);
            $Util.default.assertAsString(error.message);
            return undefined
        }
    }

    async writeValidateFile(domain, path, content) {
        console.info('write validate content to file: ', domain, path, content)
    }

    async getCertDetail(id) {
        let getUserCertificateDetailRequest = new $cas20200407.GetUserCertificateDetailRequest({ certId: id });
        let runtime = new $Util.RuntimeOptions({});
        try {
            // 复制代码运行请自行打印 API 的返回值
            const data = await this.cas.getUserCertificateDetailWithOptions(getUserCertificateDetailRequest, runtime);
            console.log(data)
            return data.body
        } catch (error) {
            // 错误 message
            console.log(error.message);
            // 诊断地址
            console.log(error.data["Recommend"]);
            $Util.default.assertAsString(error.message);
            return undefined
        }
    }

    async getCertInfo(domain, name) {
        console.info('获取域名证书信息:', domain)
        let listUserCertificateOrderRequest = new $cas20200407.ListUserCertificateOrderRequest({
            orderType: "CERT",
            keyword: domain,
        });
        let runtime = new $Util.RuntimeOptions({});
        try {
            // 复制代码运行请自行打印 API 的返回值
            const data = await this.cas.listUserCertificateOrderWithOptions(listUserCertificateOrderRequest, runtime);

            for (let cert of data.body.certificateOrderList) {
                console.info(`证书名称: ${cert.commonName}, 函数计算证书名称: ${name}, 比对结果：${cert.commonName === name}`)
                if (cert.commonName === name) {
                    return cert
                }
            }

            return data.body.certificateOrderList[0]
        } catch (error) {
            // 错误 message
            console.error(error.message);
            // 诊断地址
            console.error(error.data["Recommend"]);

            return undefined
            // $Util.default.assertAsString(error.message);
        }
    }
}

module.exports = {
    FunctionComputeCertRenew
}