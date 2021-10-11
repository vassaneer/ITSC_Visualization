const MysqlGateway = require("./MysqlGateway")

const { SyntheticGateway } = require("forge-dataviz-iot-data-modules/server");

async function  test(){
    const syntheticDataRoot = `${__dirname}/../gateways/synthetic-data`;
    const deviceModelFile = process.env.DEVICE_MODEL_JSON || `${syntheticDataRoot}/device-models.json`;
    const configFile2 = process.env.SYNTHETIC_CONFIG || `${syntheticDataRoot}/config.json`
    req.dataGateway = new MysqlGateway(deviceModelFile ,configFile2);
    const test1 = await s.getAggregates()
    console.log(test1)
}

test()
