const DataGateway = require("forge-dataviz-iot-data-modules/server/gateways/Hyperion.Server.DataGateway");

const mysql = require('mysql');
const tweenFunctions = require("tween-functions");
const { loadJSONFile } = require("forge-dataviz-iot-data-modules/server/gateways/FileUtility.js");
const STARTDATE = new Date("2021-01-01");

const name_mysql = "bot";
const password_mysql = "59781352640@Ab";
const ipAddress_mysql = "128.199.183.124";
const db_mysql = "itsc";

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

/**
 * @classdesc A data gateway that supplies synthetic data.
 * @class
 * @augments DataGateway
 */

class MysqlGateway extends DataGateway {
    constructor(deviceModelFile ,configFile) {
        super("mysql");
        this.deviceModelFile = deviceModelFile
        this.configFile = configFile;
    }

    async getDeviceModels(){
        /** adjust from database
         * @propertyType
         * @rangeMin
         * @rangeMax
         */
            this.db = await mysql.createConnection({
                host: ipAddress_mysql,
                user: name_mysql,
                password: password_mysql,
                database: db_mysql
            })
            // get max and min in all device
            const firstTask = new Promise((resolve, reject) => {
                this.db.query("select s.id, s.Name, s.Unit,min(l.Epoch) as min,max(l.Epoch) as max, min(l.Value) as rangemin, max(l.Value) as rangemax from sensor s inner join log l on s.id=l.Sensor and l.device >10 group by id", (err, results)=>{
                    if(err) throw err;
                    var arr = []
                    Object.entries(results).forEach((entry) => {
                        const [key, value] = entry;
                        arr.push({
                            propertyId:value.Name, 
                            propertyName:value.Name, 
                            propertyUnit:value.Unit, 
                            propertyType: "double",
                            firstDay:value.min,
                            lastDay:value.max,
                            rangeMin: value.rangemin,
                            rangeMax: value.rangemax
                        })
                      }); 
                      resolve(arr)
                      this.db.end();
                })
            })
            const data = await firstTask;
            return [{
            "deviceModelId":"d370a293-4bd5-4bdb-a3df-376dc131d44c", 
            "deviceModelName": "Human Comfort Sensor",
            "deviceModelDesc": "Monitors indoor air quality by measuring levels of Carbon Dioxide (CO2), temperature, and humidity.",
            "deviceProperties":data
        }]
    }

    async getDevicesInModel(deviceModelId){
        this.db = await mysql.createConnection({
            host: ipAddress_mysql,
            user: name_mysql,
            password: password_mysql,
            database: db_mysql
        })
        
        const firstTask = new Promise((resolve, reject) => {
            this.db.query("select d.id as number,d.name as deviceName, r.dbid as dbId, d.Position_x as x, d.Position_y as y, d.Position_z as z, exists(select * from log l where l.Device=d.id and d.Active=1) as status from device d inner join rack r on r.id = d.rack and d.id>10 order by dbid", (err, results)=>{
                if(err) throw err;
                var arr = []
                Object.entries(results).forEach((entry) => {
                    const [key, value] = entry;
                    arr.push({
                        id:value.deviceName, 
                        name:value.dbId,
                        position :{
                            x: value.x,
                            y: value.y,
                            z: value.z,                          
                        },
                        status:value.status,
                        number:value.number
                    })
                  }); 
                  resolve(arr)
                  this.db.end();
            })
        })

        const data = await firstTask
        return {"deviceModelId":"d370a293-4bd5-4bdb-a3df-376dc131d44c","deviceInfo":data}
        
    }

    async getAggregates(deviceId, propertyId, startSecond, endSecond, resolution) {
      
       
        // Just sample data, no need to validate existence of device/property IDs.
        const totalSeconds = Math.abs(endSecond - startSecond);
        let dataPoints = 0;
        if (resolution === "1d" || resolution == "PT1D" || resolution == "P1D") {
            dataPoints = 1 + Math.floor(totalSeconds / (60 * 60 * 24));
        } else if (resolution === "1h" || resolution == "PT1H") {
            dataPoints = 1 + Math.floor(totalSeconds / (60 * 60));
        } else if (resolution === "1m") {
            dataPoints = 1 + Math.floor(totalSeconds / 60);
        } else if(resolution === "PT5M") {
            dataPoints = 1 + Math.floor(totalSeconds / 60 / 5);
        } else if(resolution === "PT15M") {
            dataPoints = 1 + Math.floor(totalSeconds / 60 / 15);
        } else if(resolution === "PT6H") {
            dataPoints = 1 + Math.floor(totalSeconds / (60 * 60 * 6));
        } else {
            dataPoints = 1 + Math.floor(totalSeconds / 60 / 5);
        }

        // Keep to a reasonable data points to return to client.
        dataPoints = dataPoints > 1 ? dataPoints : 2;
        const maxDataPoints = dataPoints < 100 ? dataPoints : 100;
        const gapSeconds = Math.floor(totalSeconds / (maxDataPoints - 1));
        const timestamps = [];
        const countValues = [];
        var minValues = 0;
        var maxValues = 0;
        const avgValues = [];
        const sumValues = [];
        const stdDevValues = [];
        /**
         * select timestamp from startSecond until endSecond
         *  
         * */ 
        const firstTask = (startEpoch, endEpoch) =>{
           return  new Promise(async (resolve, reject) => {
            this.db = await mysql.createConnection({
                host: ipAddress_mysql,
                    user: name_mysql,
                    password: password_mysql,
                    database: db_mysql
            })
                this.db.query("select d.name, l.value, l.epoch, s.name as sensor from log l inner join device d inner join sensor s on l.device = d.id and s.id=l.sensor where  d.id = ? and s.name = ? and l.epoch> ? and l.epoch< ?",[deviceId,propertyId, startEpoch, endEpoch], (err, results)=>{
                    if(err) throw err;
                    var arr = []
                     Object.entries(results).forEach((entry) => {
                        const [key, value] = entry;
                        arr.push(value.value)
                      }); 
                    resolve(arr)
                      // and close db
                      this.db.end();
                })
            })
        }

         // get max and min in all device
         const secondTask = new Promise(async (resolve, reject) => {
            this.db = await mysql.createConnection({
                host: ipAddress_mysql,
                    user: name_mysql,
                    password: password_mysql,
                    database: db_mysql
            })
            this.db.query("select min(l.Value) as rangemin, max(l.Value) as rangemax from sensor s inner join log l on s.id=l.Sensor and l.device>10 and s.name= ?",[propertyId], (err, results)=>{
                if(err) throw err;
                var arr = []
                Object.entries(results).forEach((entry) => {
                    const [key, value] = entry;
                    arr.push({
                        rangeMin: value.rangemin,
                        rangeMax: value.rangemax
                    })
                  }); 
                   resolve(arr)
                    this.db.end();
            })
        })
        const range = await secondTask;

         /**
          * aggregation map data to (maxDataPoints)
          */
        let currSecond = startSecond;
        const data = await firstTask(startSecond,endSecond);
        if(data.length!=0){
            for (let i = 0; i < maxDataPoints; ++i, currSecond += gapSeconds) {
                timestamps.push(currSecond);
                let values = [];
                values = data;
                if(values.length!=0){
                    const ss = i*Math.floor(data.length/maxDataPoints)
                    const ee = (i+1)*Math.floor(data.length/maxDataPoints)
                    values = data.slice(ss, ee);
                }
                countValues.push(values.length);
                minValues =range[0].rangeMin;
                maxValues = range[0].rangeMax;
                const sum = values.reduce((p, c) => p + c);
                const avg = sum / values.length;
                sumValues.push(sum);
                avgValues.push(avg);
                const sd = values.reduce((p, c) => p + Math.pow(c - avg, 2));
                stdDevValues.push(Math.sqrt(sd / values.length));
            }
        }
        return {
            timestamps: timestamps,
            count: countValues,
            min: minValues,
            max: maxValues,
            avg: avgValues.map((v) => parseFloat(v.toFixed(2))),
            sum: sumValues.map((v) => parseFloat(v.toFixed(2))),
            stdDev: stdDevValues.map((v) => parseFloat(v.toFixed(2))),
        };
        
    }

    async newSprite(dbId, _nameRack, _nameDevice ,_posX, _posY, _posZ){
        /**
         * get id of rack from dbid
         */
         this.db = await mysql.createConnection({
            host: ipAddress_mysql,
            user: name_mysql,
            password: password_mysql,
            database: db_mysql
        })
        
        const addNewDevice = new Promise((resolve, reject) => {
            this.db.query("call newDevice(?,?,?,?,?,?)",[dbId, _nameRack, _nameDevice, _posX, _posY, _posZ],(err, results)=>{
                resolve({
                    status:'success',
                    dbId:dbId,
                    device:_nameDevice,
                    pos_x:_posX,
                    pos_y:_posY,
                    pos_z:_posZ
                })
                this.db.end();
            })
        })
        return addNewDevice;
    }

    async editSpriteStatus(_id, _status){
         /**
         * get id of rack from dbid
         */
          this.db = await mysql.createConnection({
            host: ipAddress_mysql,
            user: name_mysql,
            password: password_mysql,
            database: db_mysql
        })
        const status = _status? 1 : 0;
        // console.log(_id)
        // console.log(status)
        const addNewDevice = new Promise((resolve, reject) => {
            this.db.query("update device set Active=? where id=?",[status, _id],(err, results)=>{
                resolve({
                    status:'success',
                })
            })
        })
        return addNewDevice;
    }
}
module.exports = MysqlGateway;