const { CsvDataGateway } = require("forge-dataviz-iot-data-modules/server");
const { SyntheticGateway } = require("forge-dataviz-iot-data-modules/server");
const { AzureGateway } = require("forge-dataviz-iot-data-modules/server");
const MysqlGateway  = require("forge-dataviz-iot-data-modules/server/gateways/MysqlGateway");

module.exports = function (router) {
    function gatewayFactory(req, res, next) {
        const provider = req.query.provider;
        const project = req.query.project;
        let deviceModelFile, deviceFile;

        const syntheticDataRoot = `${__dirname}/../gateways/synthetic-data`;

        if (!provider || !project) {
            res.status(400).send("Missing query parameters: provider, project");
        } else {
            switch (provider) {
                case "aws":
                    break;
                case "azure":
                    deviceModelFile = process.env.DEVICE_MODEL_JSON || `${syntheticDataRoot}/device-models.json`;
                    req.dataGateway = new AzureGateway(deviceModelFile);
                    break;
                case "mysql":
                    deviceModelFile = process.env.DEVICE_MODEL_JSON || `${syntheticDataRoot}/device-models.json`;
                    const configFile2 = process.env.SYNTHETIC_CONFIG || `${syntheticDataRoot}/../data-gateways/config.json`
                    req.dataGateway = new MysqlGateway(deviceModelFile ,configFile2);
                    break;
                case "csv":
                    deviceModelFile = process.env.CSV_MODEL_JSON || `${syntheticDataRoot}/device-models.json`;
                    deviceFile = process.env.CSV_DEVICE_JSON || `${syntheticDataRoot}/devices.json`;
                    const dataFolder = process.env.CSV_FOLDER || `${__dirname}/../gateways/csv`;
                    const delimiter = process.env.CSV_DELIMITER || "\t";
                    const lineBreak = process.env.CSV_LINE_BREAK || "\n";
                    const timeStampColumn = process.env.CSV_TIMESTAMP_COLUMN || "time";
                    const options = {
                        delimiter,
                        lineBreak,
                        timeStampColumn,
                    };
                    const fileExtension = process.env.CSV_FILE_EXTENSION || ".csv";

                    req.dataGateway = new CsvDataGateway(
                        deviceModelFile,
                        deviceFile,
                        dataFolder,
                        options,
                        fileExtension
                    );
                    break;
                default:
                    deviceModelFile = process.env.DEVICE_MODEL_JSON || `${syntheticDataRoot}/device-models.json`;
                    deviceFile = process.env.DEVICE_JSON || `${syntheticDataRoot}/devices.json`;
                    const configFile = process.env.SYNTHETIC_CONFIG || `${syntheticDataRoot}/config.json`
                    req.dataGateway = new SyntheticGateway(deviceModelFile, deviceFile, configFile);
                    break;
            }

            next();
        }
    }

    function setCacheHeader(res, time) {
        if (/(stage|staging|prod)/gi.test(process.env.ENV)) {
            res.set("Cache-Control", `public, max-age=${time}`);
        } else {
            // for local and dev, only cache for 1
            time = time > 600 ? 600 : time;
            res.set("Cache-Control", `public, max-age=${time}`);
        }
    }

    function setCORS(req, res, next) {
        res.set("Access-Control-Allow-Origin", process.env.CORS);
        next();
    }

    router.get("/api/device-models", gatewayFactory, setCORS, function (req, res) {
        /** @type {DataGateway} */
        const dataGateway = req.dataGateway;
        dataGateway
            .getDeviceModels()
            .then((deviceModels) => {
                setCacheHeader(res, 60 * 5);
                res.status(200).json(deviceModels);
            })
            .catch((error) => {
                res.status(500).send(error);
            });
    });

    router.get("/api/devices", gatewayFactory, setCORS, function (req, res) {
        /** @type {DataGateway} */
        const dataGateway = req.dataGateway;
        // This is an optional query parameter for providers that support it.
        const deviceModelId = req.query ? req.query.model : undefined;

        dataGateway
            .getDevicesInModel(deviceModelId)
            .then((devices) => {
                //setCacheHeader(res, 60 * 60 * 4);
                res.status(200).json(devices);
            })
            .catch((error) => {
                console.error(error);
                res.status(500).send(error);
            });
    });

    /**
     * Temporary handler to return aggregated data for a given device, its property,
     * and time window. This handler has obviously omitted a ton of validation as it
     * is merely a temporary stop-gap measure before we finally have data from cloud
     * providers. This will be removed soon as those become available.
     */
    router.get("/api/aggregates", gatewayFactory, setCORS, function (req, res) {
        const device = req.query.device;
        const property = req.query.property;
        const startTime = req.query.startTime;
        const endTime = req.query.endTime;
        const resolution = req.query.resolution;

        if (!device || !property || !startTime || !endTime || !resolution) {
            res.status(400).send("Missing query parameters: device, property, startTime, endTime, resolution");
            return;
        }

        // DataGateway accepts numerical time values.
        const startSecond = parseInt(startTime);
        const endSecond = parseInt(endTime);

        /** @type {DataGateway} */
        const dataGateway = req.dataGateway;

        dataGateway
            .getAggregates(device, property, startSecond, endSecond, resolution)
            .then((aggregates) => {
                setCacheHeader(res, 60 * 60 * 2);
                res.status(200).json(aggregates);
            })
            .catch((error) => {
                console.error(error);
                res.status(500).send(error);
            });
    });

    /**
     * Post from web for add new sprite to database
     */

    router.post('/api/sprite/add', gatewayFactory, setCORS, function(req,res){
        const dbId=req.body.dbId
        const nameDevice=req.body.nameDevice
        const nameRack=req.body.nameRack
        const pos_x=req.body.pos_x
        const pos_y=req.body.pos_y
        const pos_z=req.body.pos_z
        const dataGateway = req.dataGateway;
        dataGateway.newSprite(dbId, nameRack, nameDevice, pos_x, pos_y, pos_z)
        .then((newSprite) => {
            //setCacheHeader(res, 60 * 60 * 2);
            res.status(200).json(newSprite);
        })
        .catch((error) => {
            console.error(error);
            res.status(500).send(error);
        });
    })

    /**
     * get from web for delete sprite to database
     */
    router.post('/api/sprite/editStatus', gatewayFactory, setCORS, function(req,res){
        const id = req.body.id;
        const status = req.body.status
        const dataGateway = req.dataGateway;
        dataGateway.editSpriteStatus(id, status)
        .then((newSprite) => {
            //setCacheHeader(res, 60 * 60 * 2);
            res.status(200).json(newSprite);
        })
        .catch((error) => {
            console.error(error);
            res.status(500).send(error);
        });
    })
};
