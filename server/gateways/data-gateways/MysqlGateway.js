const DataGateway = require("forge-dataviz-iot-data-modules/server/gateways/Hyperion.Server.DataGateway");

const mysql = require('mysql');
const tweenFunctions = require("tween-functions");
const { loadJSONFile } = require("forge-dataviz-iot-data-modules/server/gateways/FileUtility.js");
const STARTDATE = new Date("2021-01-01");

function randomSign() {
    return Math.random() > 0.5 ? 1 : -1;
}

function random(v) {
    return randomSign() * Math.random() * v;
}

function weekNum(time) {
    var weekNo = Math.abs(Math.ceil(((time - STARTDATE) / 86400000 + 1) / 7));
    return weekNo % 2;
}

class Synthetic {
    /**
     *
     * @param {string} configFile File path to config file defining the data stops and range values used to generate synthetic data. For an example, refer to https://github.com/Autodesk-Forge/forge-dataviz-iot-reference-app/blob/main/server/gateways/synthetic-data/config.json
     */
    constructor(configFile) {
        this.configFile = configFile;
    }

    nextStop(stops, index, direction) {
        let nextIndex = index + 1 * direction;

        while (nextIndex < 0 && stops.length > 0) {
            nextIndex += stops.length;
        }
        nextIndex = nextIndex % stops.length;

        let stop = stops[nextIndex].slice(0);
        if ((nextIndex > index && direction < 0) || (nextIndex < index && direction > 0)) {
            stop[0] += 24 * direction;
        }

        return stop;
    }

    _getTweenFunction(start, end) {
        return start > end ? "easeInSine" : "easeOutSine";
    }

    _getStops(sensorType, time) {
        let week = weekNum(time);
        let day = time.getDay() % 7;
        let sensorConfig = this.config["Strategy"][sensorType] || this.config["Strategy"]["Temperature"];
        return sensorConfig[day][week];
    }

    async value(sensorType, currentTime, interval) {
        if (!this.config) this.config = await loadJSONFile(this.configFile);
        let hour = this._timeToDecimal(currentTime);
        let self = this;
        let stops = this._getStops(sensorType, currentTime);
        let { min, max } = this.config["Range"][sensorType] || this.config["Range"]["Temperature"];

        function tweenValue(hour, start, end) {
            let duration = end[0] - start[0];
            let current = hour - start[0];

            let startV = min + (max - min) * start[1];
            let endV = min + (max - min) * end[1];

            let variant = ((endV - startV) / (duration / interval)) * random(5);
            let tween = self._getTweenFunction(startV, endV);
            let v = tweenFunctions[tween](current, startV, endV, duration) + variant;
            return v;
        }

        for (let i = 0; i < stops.length; i++) {
            let c = stops[i];
            let p = this.nextStop(stops, i, -1);
            let n = this.nextStop(stops, i, 1);

            if (c[0] >= hour && p[0] <= hour) {
                return tweenValue(hour, p, c);
            } else if (c[0] <= hour && n[0] >= hour) {
                return tweenValue(hour, c, n);
            }
        }
    }

    _timeToDecimal(time) {
        return time.getHours() + time.getMinutes() / 60 + time.getSeconds() / 60 / 60;
    }
}

/**
 * @classdesc A data gateway that supplies synthetic data.
 * @class
 * @augments DataGateway
 */

class MysqlGateway extends DataGateway {
    constructor(configFile) {
        super("mysql");
        this.configFile = configFile;
    }
    async getDeviceModels(){
        this.db = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "1234",
            database: "itsc"
        })
        const firstTask = new Promise((resolve, reject) => {
            this.db.query("select * from sensor", (err, results)=>{
                if(err) throw err;
                var arr = []
                Object.entries(results).forEach((entry) => {
                    const [key, value] = entry;
                    arr.push({propertyId:value.Name, propertyName:value.Name, propertyUnit:value.Unit})
                  }); 
                  resolve(arr)
            })
        })
        const data = await firstTask;
        return [{"deviceModelId":0,"deviceProperties":data}]
    }
    async getDevicesInModel(deviceModelId){
        this.db = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "1234",
            database: "itsc"
        })
        
        const firstTask = new Promise((resolve, reject) => {
            this.db.query("select d.name as deviceName, r.name as rackName, d.position from device d inner join rack r on r.id = d.rack", (err, results)=>{
                if(err) throw err;
                var arr = []
                Object.entries(results).forEach((entry) => {
                    const [key, value] = entry;
                    arr.push({id:value.deviceName, name:value.rackName, position : value.position })
                  }); 
                  resolve(arr)
            })
        })

        const data = await firstTask
        return {"deviceModelId":0,"deviceInfo":data}
        
    }

    async getAggregates(deviceId, propertyId, startSecond, endSecond, resolution) {
        
        // this.db = await mysql.createConnection({
        //     host: "localhost",
        //     user: "root",
        //     password: "1234",
        //     database: "itsc"
        // })

        // const firstTask = new Promise((resolve, reject) => {
        //     this.db.query("select d.name, l.value, l.date, s.name as sensor from log l inner join device d inner join sensor s on l.device = d.id and s.id=l.sensor where d.name = ?",[deviceId], (err, results)=>{
        //         if(err) throw err;
        //         var arr = []
        //         Object.entries(results).forEach((entry) => {
        //             const [key, value] = entry;
        //             arr.push({id:value.name, date:value.date, value : value.value , sensor:value.sensor})
        //           }); 
        //           resolve(arr)
        //     })
        // })

        // const data = await firstTask
        // //console.log(data)
        // const tims = data.map(i=>{ 
        //     return (new Date(i.date)).getTime() });
        // // get minimum, maximum, average, sum of data
        // const mins = data.map(i=> i.value );
        // const maxs = data.map(i=> i.value );
        // const avgs = data.map(i=> i.value );
        // const sums = data.map(i=> i.value );
        // //console.log(sums)
        // return {
        //     timestamps: tims,
        //     count: sums,
        //     min: mins,
        //     max: maxs,
        //     avg: avgs,
        //     sum: sums,
        //     stdDev: avgs,
        // };
        deviceId; // Not used for synthetic data generation.
        propertyId; // Not used for synthetic data generation.
        let synthetic = new Synthetic(this.configFile);

        // Just sample data, no need to validate existence of device/property IDs.
        const totalSeconds = Math.abs(endSecond - startSecond);

        let dataPoints = 0;
        if (resolution === "1d" || resolution == "PT1D") {
            dataPoints = 1 + Math.floor(totalSeconds / (60 * 60 * 24));
        } else if (resolution === "1h" || resolution == "PT1H") {
            dataPoints = 1 + Math.floor(totalSeconds / (60 * 60));
        } else if (resolution === "1m") {
            dataPoints = 1 + Math.floor(totalSeconds / 60);
        } else {
            dataPoints = 1 + Math.floor(totalSeconds / 60 / 5);
        }

        // Keep to a reasonable data points to return to client.
        dataPoints = dataPoints > 1 ? dataPoints : 2;
        const maxDataPoints = dataPoints < 100 ? dataPoints : 100;

        const gapSeconds = Math.floor(totalSeconds / (maxDataPoints - 1));

        const timestamps = [];
        const countValues = [];
        const minValues = [];
        const maxValues = [];
        const avgValues = [];
        const sumValues = [];
        const stdDevValues = [];

        let currSecond = startSecond;
        for (let i = 0; i < maxDataPoints; ++i, currSecond += gapSeconds) {
            timestamps.push(currSecond);

            // Generate a series of random data points.
            let values = [];
            let step = gapSeconds / 32;
            let intervalToHour = gapSeconds / 60 / 60;
            for (let i = 0; i < 32; i++) {
                let time = new Date(Math.round((currSecond + step * i) * 1000));
                let v = await synthetic.value(propertyId, time, intervalToHour);
                values.push(v);
            }

            // const values = [...new Array(32)].map((_) => Math.random() * gap + min);

            countValues.push(values.length);

            minValues.push(Math.min(...values));
            maxValues.push(Math.max(...values));

            const sum = values.reduce((p, c) => p + c);
            const avg = sum / values.length;
            sumValues.push(sum);
            avgValues.push(avg);

            const sd = values.reduce((p, c) => p + Math.pow(c - avg, 2));
            stdDevValues.push(Math.sqrt(sd / values.length));
        }

        return {
            timestamps: timestamps,
            count: countValues,
            min: minValues.map((v) => parseFloat(v.toFixed(2))),
            max: maxValues.map((v) => parseFloat(v.toFixed(2))),
            avg: avgValues.map((v) => parseFloat(v.toFixed(2))),
            sum: sumValues.map((v) => parseFloat(v.toFixed(2))),
            stdDev: stdDevValues.map((v) => parseFloat(v.toFixed(2))),
        };
    }
}
module.exports = MysqlGateway;