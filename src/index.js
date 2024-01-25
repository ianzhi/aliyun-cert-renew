const fc = require('./fc')

exports.handler = (event, context, callback) => {
    if (isEmpty(process.env.ACCESS_KEY_ID) || isEmpty(process.env.ACCESS_KEY_SECRET)) {
        return callback(new Error('必须设置ACCESS_KEY_ID和ACCESS_KEY_SECRET环境变量'))
    }

    const domains = [
        'www.dnote.cn'
    ]

    const fcCertRenew = new fc.FunctionComputeCertRenew(process.env.ACCESS_KEY_ID, process.env.ACCESS_KEY_SECRET)
    const promises = []
    for (const domain of domains) {
        promises.push(fcCertRenew.checkDomainCert(domain))
    }
    Promise.all(promises).then(() => callback(null, ''));
}

function isEmpty(v) {
    return v === undefined || v === null || v === 0 || v === false || v === ''
}