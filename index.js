/*eslint-disable max-lines */
/*eslint-disable consistent-this */
/*eslint-disable radix */
/*eslint-disable class-methods-use-this */
/*eslint-disable valid-jsdoc */

const redis = require('redis');
const uuid = require('node-uuid');
const traverse = require('traverse');
const _u = require('underscore');
const async = require("async");
const conditional = require('async-if-else')({});
const ByteBuffer = require("bytebuffer");

let redisClient = {};

module.exports = class datalake {
    constructor() {
        this.RedisConnected = false;
    }
    createConnection(ConnectionObj) {
        var self = this;
        self.ConnectionObj = ConnectionObj;
        return new Promise(function (resolve, reject) {
            let client = {};

            if (!ConnectionObj) {
                return reject({ Status: false, Message: 'No Connection Object Found' });
            }
            client = redis.createClient(ConnectionObj);
            client.on('connect', function () {
                console.log("redis Connected");

                client.select(ConnectionObj.dbname, function () {
                    console.log("Redis db " + ConnectionObj.dbname + " selected");
                    redisClient = client;
                    self.RedisConnected = true;
                    return resolve();
                });
            });
            client.on('error', function (err) {
                return reject(err);
            });
        });
    }
    closeConnection() {
        redisClient.quit();
        this.RedisConnected = false;
    }
    GetSchemaList() {
        var self = this;
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                if (self.RedisConnected) {
                    redisClient.keys("TpSchemaSet:*", function (err, res) {
                        if (err) {
                            retJSON.Status = 'false';
                            retJSON.Message = err;
                            return resolve(retJSON);
                        }
                        retJSON.Status = 'true';
                        retJSON.Message = 'Success';
                        retJSON.items = res.toString().replace(/TpSchemaSet:/g, "").
                            split(',');
                        return resolve(retJSON);
                    });
                } else {
                    retJSON.Status = 'false';
                    retJSON.Message = 'Redis not Connected';
                    return resolve(retJSON);
                }
            } catch (error) {
                retJSON.Status = "false";
                retJSON.Message = error;
                console.log({ details: "getSchemaList exception", error: error });
                return reject(retJSON);
            }
        });
    }
    SetKeyData(postData) {
        var self = this;
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                if (self.RedisConnected) {
                    var Schema = postData ? postData.Schema : '';
                    var Key = postData ? postData.Key : '';
                    var Data = postData ? postData.Data.toString().trim() : '';
                    var TimeOut = postData ? postData.TimeOut : 10;
                    redisClient.HSET(Schema, Key, Data);
                    redisClient.EXPIRE(Schema, TimeOut);
                    retJSON.Status = 'true';
                    retJSON.Message = 'Success';
                    return resolve(retJSON);
                }
                retJSON.Status = 'false';
                retJSON.Message = 'Redis not Connected';
                return resolve(retJSON);
            } catch (error) {
                console.log(error);
                return reject(error);
            }
        });
    }
    GetKeyData(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var Hash = postData ? postData.Schema : '';
                if (self.RedisConnected) {
                    redisClient.hgetall(Hash, function (err, response) {
                        if (err) {
                            retJSON.Status = 'false';
                            retJSON.Message = err;
                            return resolve(retJSON);
                        }
                        if (response) {
                            var resultArray = [];
                            for (var index in response) { // eslint-disable-line
                                resultArray = resultArray.concat(response[index]);
                            }
                            retJSON.Status = 'true';
                            retJSON.Data = resultArray;
                            return resolve(retJSON);
                        }
                        return resolve('Hash not found in Redis');
                    });
                }
            } catch (error) {
                console.log(error);
                retJSON.Status = 'false';
                retJSON.Message = error;
                return reject(retJSON);
            }
        });
    }
    showStatus() {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (self.RedisConnected) {
                return resolve({
                    Status: 'TP Redis Module Loaded and Ready to Rock and Roll...',
                    Message: 'DataLake - Licensed by SkunkworxLab, LLC.'
                });
            }
            return reject({
                Status: false,
                Message: 'DataLake - Licensed by SkunkworxLab, LLC.'
            });
        });
    }

    /**
     * CreateTPGuid is to Create Guid for insert Record
     * @return GUID
     * @function CreateTPGUID
     * @param {any} VESShortCode 
     * @param {any} Guid 
     * @param {any} callback 
     */
    CreateTPGUID(VESShortCode, Guid, callback) {
        var self = this;
        var myUUID = Guid ? Guid : uuid.v4();
        try {
            if (self.RedisConnected) {
                redisClient.sadd('TpSchemaSet:' + VESShortCode, myUUID);
            } else {
                console.log({ details: 'CreateTPGUID', error: 'Redis connection problem' });
            }
            return callback(null, myUUID);
        } catch (err) {
            console.log({ details: 'CreateTPGUID exception', error: err });
            return callback(null, myUUID);
        }
    }

    /** 
      * This function is to be called to parse the JSON.
      * @returns {JSON} parsed JSON is returned
      * @function getPayloadData
      * @param {ServerObject} request - Incoming server request object
      */
    getPayloadData(request) {
        try {
            var payloadStr = request;
            var payload = "";
            if (typeof (payloadStr) == "object") {
                payload = payloadStr;
            } else {
                try {
                    payload = JSON.parse(payloadStr);
                } catch (err) {
                    console.log({ details: "getPayloadData exception", error: err });
                    return false;
                }
            }
            return payload;
        } catch (err) {
            console.log({ details: "getPayloadData error", error: err });
            return false;
        }
    }

    /** 
      * This function is to be called to run the insert TidalPool Schema request.
      * @returns {string} TidalPool Schema GUID is returned
      * @function InsertTidalPoolSchema
      * @param {ServerObject} request - Incoming server request object
      * @param {ServerObject} reply - Outgoing server reply object
      */
    InsertTidalPoolSchema(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);

                if (!payload.VESShortCode) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                self.CreateTPGUID(payload.VESShortCode, payload.Guid ? payload.Guid : null, function (err, Guid) {
                    if (err) {
                        console.log('redis not connected');
                        console.log({ details: "InsertTidalPoolSchema", error: retJSON });
                        retJSON.Status = "false";
                        retJSON.Message = "Redis connection problem";
                        retJSON.insertId = "";
                    } else {
                        retJSON.Status = "true";
                        retJSON.Message = "Success";
                        retJSON.insertId = Guid;
                    }
                    return resolve(retJSON);
                });
            } catch (err) {
                console.log('err', err);
                retJSON.Status = "false";
                retJSON.Message = err;
                retJSON.insertId = "";
                console.log({ details: "InsertTidalPoolSchema exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    /**
     * This function will hset TpSearchHash
     * @function SetupTPSearchHash
     * @returns {undefined} Nothing is Returned
     * @param  {String} VESShortCode - VESShortCode
     * @param  {String} Keyword - Keyword
     * @param  {String} ShortCodes - ShortCodes
     */
    SetupTPSearchHash(VESShortCode, Keyword, ShortCodes) {
        var self = this;
        try {
            if (self.RedisConnected) {
                redisClient.hset("TpSearchHash:" + VESShortCode, Keyword, ShortCodes);
            } else {
                console.log({ details: "SetupTPSearchHash", error: "Redis connection problem" });
            }
        } catch (err) {
            console.log({ details: "SetupTPSearchHash exception", error: err });
        }
    }

    /** 
      * This function is to be called to Setup Search Hash.
      * @returns {undefined} Nothing is returned
      * @function SetupSearchHash
      * @param {ServerObject} request - Incoming server request object
      * @param {ServerObject} reply - Outgoing server reply object
      */
    SetupSearchHash(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);

                if (!payload.ShortCodes) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                if (self.RedisConnected) {
                    var ShortCodes = (typeof (payload.ShortCodes) == "string") ? payload.ShortCodes : JSON.stringify(payload.ShortCodes);
                    self.SetupTPSearchHash(payload.VESShortCode, payload.Keyword, ShortCodes);
                    retJSON.Status = "true";
                    retJSON.Message = "Success";
                } else {
                    retJSON.Status = "false";
                    retJSON.Message = "Redis connection problem";
                    console.log({ details: "SetupSearchHash", error: retJSON });
                }
                return resolve(retJSON);
            } catch (err) {
                retJSON.Status = "false";
                retJSON.Message = err;
                console.log({ details: "SetupSearchHash exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    /** 
     * This function is to be called to add the data to redis.
     * @returns {undefined} Nothing is returned
     * @function addRedisData
     * @param {string} type - type
     * @param {string} VESShortCode - VESShortCode
     * @param {string} Keyword - Keyword
     * @param {string} ShortCode - ShortCode
     * @param {string} Value - Value
     * @param {string} Guid - Guid
     */
    addRedisData(type, VESShortCode, Keyword, ShortCode, Value, Guid) {
        try {
            if (type == "string") {
                redisClient.sadd("TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + ShortCode + ":" + Value, Guid);
            } else if (type == "integer" && !(isNaN(Value))) {
                redisClient.zadd("TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + ShortCode, Value, Guid);
            } else if (type == "date") {
                var dateValue = new Date(Value);
                dateValue = dateValue.toLocaleString();
                dateValue = dateValue.replace(/[^\w\s]/g, '').replace(/ /g, '').
                    replace(/AM/g, '000');
                if (!(isNaN(dateValue))) {
                    redisClient.zadd("TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + ShortCode, dateValue, Guid);
                }
            }
        } catch (err) {
            console.log({ details: "addRedisData exception", error: err });
            console.log(err);
        }
    }

    /** 
      * This function is to be called to process the MetaData.
      * @returns {undefined} Nothing is returned
      * @function processMetaData
      * @param {string} VESShortCode - VESShortCode
      * @param {string} Keyword - Keyword
      * @param {string} Guid - Guid
      * @param {JSON} searchHash - searchHash
      * @param {JSON} MetaData - MetaData
      * @param {JSON} oldMetaData - oldMetaData
      */
    processMetaData(VESShortCode, Keyword, Guid, searchHash, MetaData, oldMetaData) {
        var self = this;
        try {
            for (var HashInfo of searchHash) {
                if (HashInfo && HashInfo.sc) {
                    var ShortCode = HashInfo.sc.trim();
                    var type = HashInfo.type.trim();
                    traverse(MetaData).forEach(function (Value) {
                        if (this.key != "undefined" && this.key == ShortCode) {
                            if (oldMetaData && oldMetaData.hasOwnProperty(ShortCode)) {
                                traverse(oldMetaData).forEach(function (OldValue) {
                                    if (this.key != "undefined" && this.key == ShortCode) {
                                        if (Value.trim() != OldValue.trim()) {
                                            if (type == "string") {
                                                redisClient.srem("TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + ShortCode + ":" + OldValue.trim(), Guid);
                                            } else if (type == "integer" || type == "date") {
                                                redisClient.zrem("TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + ShortCode, Guid);
                                            }
                                            self.addRedisData(type, VESShortCode, Keyword, ShortCode, Value.trim(), Guid);
                                        }
                                        Reflect.deleteProperty(oldMetaData, ShortCode);
                                        // delete oldMetaData[ShortCode];
                                        this.stop();
                                    }
                                });
                            } else {
                                self.addRedisData(type, VESShortCode, Keyword, ShortCode, Value.trim(), Guid);
                            }
                            this.stop();
                        }
                    });
                    if (oldMetaData) {
                        traverse(oldMetaData).forEach(function (OldValue) {
                            if (this.key != "undefined" && this.key == ShortCode) {
                                if (type == "string") {
                                    redisClient.srem("TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + ShortCode + ":" + OldValue.trim(), Guid);
                                } else if (type == "integer" || type == "date") {
                                    redisClient.zrem("TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + ShortCode, Guid);
                                }
                            }
                        });
                    }
                }
            }
        } catch (exp) {
            console.log({ details: "processMetaData", error: exp });
            console.log(exp);
        }
    }

    /**
     * This function is to be called to insert Search Sets.
     * @returns {undefined} Nothing is returned
     * @function populateTPSearchSet
     * @param  {String} _VESShortCode - _VESShortCode
     * @param  {GUID} _Guid - _Guid
     * @param  {String} _Keyword - _Keyword
     * @param  {Object} _MetaData - _MetaData
     * @param  {String} Type - Type
     * @param  {function} callback - callback function
     */
    populateTPSearchSet(_VESShortCode, _Guid, _Keyword, _MetaData, Type, callback) {
        try {
            var self = this;
            var Guid = "", VESShortCode = "", Keyword = "", MetaData = {};
            var missingMandatoryKeys = "";
            if (_Guid) {
                Guid = _Guid.toString();
            } else {
                missingMandatoryKeys = "Guid";
            }
            if (_VESShortCode) {
                VESShortCode = _VESShortCode.toString();
            } else {
                missingMandatoryKeys = (missingMandatoryKeys == "" ? "VESShortCode" : missingMandatoryKeys + ", VESShortCode");
            }
            if (_Keyword) {
                Keyword = _Keyword.toString();
            } else {
                missingMandatoryKeys = (missingMandatoryKeys == "" ? "Keyword" : missingMandatoryKeys + ", Keyword");
            }
            if (_MetaData) {
                MetaData = _MetaData.toString();
            } else {
                missingMandatoryKeys = (missingMandatoryKeys == "" ? "MetaData" : missingMandatoryKeys + ", MetaData");
            }

            if (missingMandatoryKeys != "") {
                console.log({ details: "populateTPSearchSet missingMandatoryKeys", error: missingMandatoryKeys });
                return callback("missingMandatoryKeys : " + missingMandatoryKeys);
            }

            if (self.RedisConnected) {
                async.waterfall([
                    function (callback) {
                        redisClient.sismember("TpSchemaSet:" + VESShortCode, Guid, function (err, res) {
                            if (err) {
                                console.log({ details: "populateTPSearchSet sismember", error: err });
                                return callback(err);
                            }
                            if (res) {
                                return callback(null);
                            }
                            return callback('Posted Guid not found in TpSchemaSet/' + VESShortCode);
                        });
                    },
                    function (callback) {
                        redisClient.hget("TpSearchHash:" + VESShortCode, Keyword, function (err, res) {
                            var response = '';
                            if (err) {
                                console.log({ details: "populateTPSearchSet hget", error: err });
                                return callback(err);
                            }
                            try {
                                response = (typeof (res) == "string") ? JSON.parse(res) : res;
                            } catch (exp) {
                                console.log({ details: "populateTPSearchSet response parse : ", error: exp });
                                return callback(exp);
                            }
                            return callback(null, response);
                        });
                    },
                    function (searchHash, callback) {
                        if (Type && Type == "Refresh") {
                            try {
                                MetaData = (typeof (MetaData) == "string") ? JSON.parse(MetaData) : MetaData;
                            } catch (err) {
                                console.log({ details: "populateTPSearchSet parse MetaData", error: err });
                                return callback(err);
                            }
                            if (searchHash) {
                                self.processMetaData(VESShortCode, Keyword, Guid, searchHash, MetaData, null);
                            }
                            return callback(null);
                        } else { //eslint-disable-line
                            var oldMetaData = "";
                            redisClient.hget("TpData:" + VESShortCode + ":" + Guid, Keyword, function (err, res) {
                                if (err) {
                                    console.log({ details: "populateTPSearchSet hget", error: err });
                                    return callback(err);
                                }
                                redisClient.hset("TpData:" + VESShortCode + ":" + Guid, Keyword, MetaData);
                                try {
                                    MetaData = (typeof (MetaData) == "string") ? JSON.parse(MetaData) : MetaData;
                                } catch (exp) {
                                    console.log({ details: "populateTPSearchSet parse MetaData", error: exp });
                                    return callback(exp);
                                }
                                if (res) {
                                    try {
                                        oldMetaData = (typeof (res) == "string") ? JSON.parse(res) : res;
                                    } catch (exp) {
                                        console.log({ details: "populateTPSearchSet parse oldMetaData", error: exp });
                                        return callback(exp);
                                    }
                                }
                                if (searchHash) {
                                    self.processMetaData(VESShortCode, Keyword, Guid, searchHash, MetaData, oldMetaData);
                                }
                                return callback(null);
                            });
                        }
                    }
                ], function (err) {
                    if (err) {
                        console.log({ details: "populateTPSearchSet waterfall", error: err });
                        return callback(err);
                    }
                    return callback(null);
                });
            } else {
                console.log({ details: "populateTPSearchSet", error: "Redis connection problem" });
                return callback("Redis connection problem");
            }
        } catch (err) {
            console.log({ details: "populateTPSearchSet exception", error: err });
            return callback(err);
        }
    }


    dataInsert(VESShortCode, Guid, Keyword, MetaData, Tag, Comment, Action, retJSON, callback) {
        try {
            var self = this;
            self.getHash('TpData:' + VESShortCode + ':' + Guid, Keyword, function (err, response) {
                if (err == 'Hash Key not found in Redis') {
                    self.populateTPSearchSet(VESShortCode, Guid, Keyword, MetaData, null, function (err) {
                        if (err) {
                            retJSON.Status = "false";
                            retJSON.Message = err;
                        } else {
                            retJSON.Status = "true";
                            retJSON.Message = "Data Inserted Successfully";
                            retJSON.Guid = Guid;
                        }
                        return callback(null, retJSON);
                    });
                }
                if (response) {
                    self.snapShotVESData(VESShortCode, Guid, Tag, Comment, Action, function (err, res) {
                        if (err) {
                            retJSON.Status = "false";
                            retJSON.Message = err;
                            return callback(null, retJSON);
                        }
                        self.populateTPSearchSet(VESShortCode, Guid, Keyword, MetaData, null, function (err) {
                            if (err) {
                                retJSON.Status = "false";
                                retJSON.Message = err;
                            } else {
                                retJSON.Status = "true";
                                retJSON.Message = "Success";
                                retJSON.Action = "Data Updated, Backup Version: " + res;
                            }
                            return callback(null, retJSON);
                        });
                    });
                }
            });
        } catch (error) {
            console.log(error);
            return callback(error);
        }
    }

    /** 
      * This function is to be called to insert TidalPool data and Search Sets.
      * @returns {undefined} Nothing is returned
      * @function InsertTPData
      * @param {ServerObject} request - Incoming server request object
      * @param {ServerObject} reply - Outgoing server reply object
      */
    InsertTPData(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);

                if (!payload) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                var newMetaData = "";
                if (payload.Certificate) {
                    var certificate = payload.Certificate;
                    try {
                        var certStr = ByteBuffer.atob(certificate.replace("BEGIN CERTIFICATE--- ", "").replace(" ---END CERTIFICATE", ""));
                        newMetaData = certStr;
                    } catch (err) {
                        console.log(err);
                        console.log({ details: "InsertTPData atob certificate exception", error: err });
                        return reject({ Status: false, Message: 'Invalid certificate Postdata' });
                    }
                }

                var Guid = "", VESShortCode = "", Keyword = "", MetaData = {}, Tag = '', Comment = '', Action = 'Update';
                var missingMandatoryKeys = "";
                if (payload.Guid) {
                    Guid = payload.Guid.toString().trim();
                } else {
                    missingMandatoryKeys = "Guid";
                }
                if (payload.VESShortCode) {
                    VESShortCode = payload.VESShortCode.toString().trim();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "VESShortCode" : missingMandatoryKeys + ", VESShortCode");
                }
                if (payload.Keyword) {
                    Keyword = payload.Keyword.toString().trim();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "Keyword" : missingMandatoryKeys + ", Keyword");
                }
                if (payload.MetaData) {
                    MetaData = payload.MetaData.toString().trim();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "MetaData" : missingMandatoryKeys + ", MetaData");
                }

                if (newMetaData) {
                    console.log("Got A Certificate MetaData");
                    MetaData = newMetaData;
                    // Add Logic to replace MetaData with newMetaData if it exists
                }
                if (missingMandatoryKeys != "") {
                    retJSON.Status = "false";
                    retJSON.Message = "missingMandatoryKeys : " + missingMandatoryKeys;
                    console.log({ details: "InsertTPData missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }

                self.dataInsert(VESShortCode, Guid, Keyword, MetaData, Tag, Comment, Action, retJSON, function (err, result) {
                    if (err) {
                        console.log(err);
                        return reject(err);
                    }
                    console.log(result);
                    return resolve(result);
                });

            } catch (err) {
                retJSON.Status = "false";
                retJSON.Message = err;
                console.log({ details: "InsertTPData exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    /** 
     * This function is to be called to get the Result from redis hash value
     * @returns {JSON} JSON is returned
     * @function getHash
     * @param {string} Hash - Hash
     * @param {string} Key - Key
     * @param {function} callback - It is a callback function
     */
    getHash(Hash, Key, callback) {
        var self = this;
        try {
            if (self.RedisConnected) {
                redisClient.hget(Hash, Key, function (err, res) {
                    if (err) {
                        return callback(err);
                    }
                    if (res) {
                        return callback(null, res);
                    }
                    return callback('Hash Key not found in Redis', null);
                });
            } else {
                return callback('Redis connection problem');
            }
        } catch (err) {
            console.log({ details: "getHash exception", error: err });
            return callback(err);
        }
    }

    formatDate(inputDate) {
        try {
            var searchDT = new Date(inputDate);
            searchDT = searchDT.toLocaleString();
            searchDT = searchDT.replace(/[^\w\s]/g, '').replace(/ /g, '').
                replace(/AM/g, '000');
            return searchDT;
        } catch (err) {
            console.log({ details: "formatDate exception", error: err });
            return "";
        }
    }

    /** 
     * This function is to be called to get the Result from redis
     * @returns {List} GuidList is returned
     * @function getResult
     * @param {List} SearchListString - SearchListString
     * @param {List} SearchLOVString - SearchLOVString
     * @param {List} SearchListScore - SearchListScore
     * @param {List} SearchLOVScore - SearchLOVScore
     * @param {Object} callback - It is a callback function
     */
    getResult(SearchListString, SearchLOVString, SearchListScore, SearchLOVScore, callback) {
        try {
            var GuidList = [];
            var hit1 = false;
            var hit2 = false;
            async.parallel([
                function (callback) {
                    if (SearchListString && SearchListString.length > 0) {
                        redisClient.sinter(SearchListString, function (err, res) {
                            hit1 = true;
                            if (err) {
                                console.log({ details: "sinter Error", error: err });
                                return callback(err);
                            }
                            if (res) {
                                return callback(null, res);
                            }
                            return callback('Hash Key not found in Redis');
                        });
                    } else {
                        return callback(null);
                    }
                },
                function (callback) {
                    var ScoreResult = [];
                    async.forEachOf(SearchListScore, function (ScoreCommand, i, callback) {
                        var searchScoreCommand = ScoreCommand.split(',');
                        redisClient.zrangebyscore(searchScoreCommand, function (err, res) {
                            hit2 = true;
                            if (err) {
                                console.log({ details: "zrangebyscore Error", error: err });
                                return callback(err);
                            }
                            if (res) {
                                if (ScoreResult.length == 0) {
                                    ScoreResult = res;
                                } else {
                                    ScoreResult = _u.intersection(ScoreResult, res);
                                }
                            }
                            return callback(null);
                        });

                    }, function (err) {
                        if (err) {
                            console.log({ details: "zrangebyscore exception", error: err });
                            return callback(err);
                        }
                        return callback(null, ScoreResult);
                    });
                }
            ], function (err, results) {
                if (err) {
                    console.log({ details: "getResult error", error: err });
                    return callback(err);
                }
                if (hit1 && hit2) {
                    GuidList = _u.intersection(results[0], results[1]);
                    return callback(null, GuidList, SearchListString, SearchLOVString, SearchListScore, SearchLOVScore);
                } else if (hit1) {
                    GuidList = results[0];
                    return callback(null, GuidList, SearchListString, SearchLOVString, SearchListScore, SearchLOVScore);
                } else if (hit2) {
                    GuidList = results[1];
                    return callback(null, GuidList, SearchListString, SearchLOVString, SearchListScore, SearchLOVScore);
                }
                return callback(null, null, SearchListString, SearchLOVString, SearchListScore, SearchLOVScore);
            });
        } catch (exp) {
            console.log({ details: "getResult exception", error: exp });
            return callback(exp);
        }
    }

    /** 
     * This function is to be called to get the Result from redis
     * @returns {List} GuidList is returned
     * @function getResultLOV
     * @param {List} preGuidList - preGuidList
     * @param {List} SearchListString - SearchListString
     * @param {List} SearchLOVString - SearchLOVString
     * @param {List} SearchListScore - SearchListScore
     * @param {List} SearchLOVScore - SearchLOVScore
     * @param {function} callback - It is a callback function
     */
    getResultLOV(preGuidList, SearchListString, SearchLOVString, SearchListScore, SearchLOVScore, callback) {
        try {
            var GuidList = [];
            var hitfn1 = false;
            var hitfn2 = false;
            async.parallel([
                function (callback) {
                    // var ScoreLOVResult = [];
                    async.forEachOf(SearchLOVString, function (command, i, callback) {
                        var searchCommand = command.split(',');
                        redisClient.sunion(searchCommand, function (err, res) {
                            hitfn1 = true;
                            if (err) {
                                console.log({ details: "sunion Error", error: err });
                                return callback(err);
                            }
                            if (res) {
                                if (GuidList.length == 0) {
                                    GuidList = res;
                                } else {
                                    GuidList = _u.intersection(GuidList, res);
                                }
                            }
                            return callback(null);
                        });
                    }, function (err) {
                        if (err) {
                            console.log({ details: "sunion exception", error: err });
                            return callback(err);
                        }
                        return callback(null, GuidList);
                    });
                },
                function (callback) {
                    var TotalScoreResult = [];
                    async.forEachOf(SearchLOVScore, function (ScoreCommandList, i, callback) {
                        hitfn2 = true;
                        var ScoreResult = [];
                        async.forEachOf(ScoreCommandList, function (ScoreCommand, i, cb) {
                            var ScoreList = ScoreCommand.split(',');
                            redisClient.zrangebyscore(ScoreList, function (err, res) {
                                if (err) {
                                    console.log({ details: "zrangebyscore Error", error: err });
                                    return cb(err);
                                }
                                if (res) {
                                    if (ScoreResult.length == 0) {
                                        ScoreResult = res;
                                    } else {
                                        ScoreResult = _u.union(ScoreResult, res);
                                    }
                                }
                                return cb(null);
                            });
                        }, function (err) {
                            if (err) {
                                console.log({ details: "zrangebyscore exception", error: err });
                                return callback(err);
                            }
                            if (TotalScoreResult.length == 0) {
                                TotalScoreResult = ScoreResult;
                            } else {
                                TotalScoreResult = _u.intersection(TotalScoreResult, ScoreResult);
                            }
                            return callback(null);
                        });
                    }, function (err) {
                        if (err) {
                            console.log({ details: "zrangebyscore exception", error: err });
                            return callback(err);
                        }
                        return callback(null, TotalScoreResult);
                    });
                }
            ], function (err, results) {
                if (err) {
                    console.log({ details: "getResult_LOV error", error: err });
                    return callback(err);
                }
                if (hitfn1 && hitfn2) {
                    GuidList = _u.intersection(results[0], results[1]);
                } else if (hitfn1) {
                    GuidList = results[0];
                } else if (hitfn2) {
                    GuidList = results[1];
                }

                if (GuidList.length > 0 && preGuidList) {
                    GuidList = _u.intersection(GuidList, preGuidList);
                } else if (preGuidList) {
                    GuidList = preGuidList;
                }
                return callback(null, GuidList);
            });
        } catch (exp) {
            console.log({ details: "getResult_LOV exception", error: exp });
            return callback(exp);
        }
    }

    /** 
     * This function is to be called to get the Result from redis
     * @returns {JSON} JSON is returned
     * @function getSearchData
     * @param {List} GuidList - GuidList
     * @param {string} VESShortCode - VESShortCode
     * @param {string} Keyword - Keyword
     * @param {function} callback - It is a callback function
     */
    getSearchData(GuidList, VESShortCode, Keyword, callback) {
        try {
            var self = this;
            var items = [];
            async.forEachOf(GuidList, function (Guid, i, callback) {
                var Hash = "TpData:" + VESShortCode + ":" + Guid;
                self.getHash(Hash, Keyword, function (err, response) {
                    if (err) {
                        console.log({ details: "getSearchData Error", error: err });
                        return callback(err);
                    }
                    var item = { Guid: Guid, Keyword: Keyword, MetaData: response };
                    items.push(item);
                    return callback(null);
                });

            }, function (err) {
                if (err) {
                    console.log({ details: "getSearchData exception", error: err });
                    return callback(err);
                }
                return callback(null, items);
            });
        } catch (exp) {
            console.log({ details: "getSearchData exception", error: exp });
            return callback(exp);
        }
    }

    /**
      * This function is to be called to Search the tidal pool Hash.
      * @returns {Object} List of Values avalilable
      * @function SearchTPHash
      * @param  {String} VESShortCode - VESShortCode
      * @param  {String} Keyword - Keyword
      * @param  {Object} payload - payload
      * @param {Array} resultArray - resultArray
      * @param  {function} callback - callback
      */
    SearchTPHash(VESShortCode, Keyword, payload, resultArray, callback) {
        try {
            var self = this;
            var keys = Object.keys(payload);
            var SearchListString = [];
            var SearchListScore = [];
            var SearchLOVString = [];
            var SearchLOVScore = [];
            async.waterfall([
                function (callback) {
                    if (Keyword) {
                        self.getHash("TpSearchHash:" + VESShortCode, Keyword, callback);
                    } else {
                        return callback('Keyword is missing..');
                    }
                },
                function (TpSearchHash, callback) {
                    var TpSearchHashJson = {};
                    try {
                        TpSearchHashJson = (typeof (TpSearchHash) == "string") ? JSON.parse(TpSearchHash) : TpSearchHash;
                    } catch (err) {
                        console.log({ details: "SearchTidalPoolHash", error: err });
                        return callback(err);
                    }

                    for (var HashInfo of TpSearchHashJson) {
                        if (HashInfo && HashInfo.sc) {
                            var ShortCode = HashInfo.sc;
                            var type = HashInfo.type;
                            for (var i = 0; i < keys.length; i++) {
                                var SearchShortCode = keys[i];
                                var SearchValue = payload[keys[i]];
                                if (SearchShortCode != "Keyword" && ShortCode == SearchShortCode) {
                                    var Search = "";
                                    if (type == "string") {
                                        if (SearchValue.indexOf(',') > -1) {
                                            var LOV = SearchValue.split(',');
                                            var lovKey = '';
                                            for (let j = 0; j < LOV.length; j++) {
                                                lovKey += "TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode.trim() + ":" + LOV[j].toString().trim() + ',';
                                            }
                                            lovKey = lovKey.slice(0, -1);
                                            SearchLOVString.push(lovKey);
                                        } else {
                                            Search = "TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode.trim() + ":" + SearchValue.trim();
                                            SearchListString.push(Search);
                                        }
                                    } else if (type == "integer") {
                                        if (SearchValue.indexOf(',') > -1) {
                                            const LOVScore = SearchValue.split(',');
                                            const LOVScoreInternal = [];
                                            for (let j = 0; j < LOVScore.length; j++) {
                                                const lovKeyScore = "TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode + "," + LOVScore[j].trim() + "," + LOVScore[j].trim();
                                                LOVScoreInternal.push(lovKeyScore);
                                            }
                                            SearchLOVScore.push(LOVScoreInternal);
                                        } else {
                                            const Values = SearchValue.split('-');
                                            if (Values.length > 1) {
                                                Search = "TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode + "," + Values[0].trim() + "," + Values[1].trim();
                                            } else {
                                                Search = "TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode + "," + Values[0].trim() + "," + Values[0].trim();
                                            }
                                            SearchListScore.push(Search);
                                        }
                                    } else if (type == "date") {
                                        if (SearchValue.indexOf(',') > -1) {
                                            var LOVScore = SearchValue.split(',');
                                            var LOVScoreInternal = [];
                                            for (var j = 0; j < LOVScore.length; j++) {
                                                var searchDT = self.formatDate(LOVScore[j]);
                                                var lovKeyScore = "TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode + "," + searchDT.trim() + "," + searchDT.trim();
                                                LOVScoreInternal.push(lovKeyScore);
                                            }
                                            SearchLOVScore.push(LOVScoreInternal);
                                        } else {
                                            var Values = SearchValue.split('-');
                                            var fromDate = self.formatDate(Values[0]);
                                            if (Values.length > 1) {
                                                var toDate = self.formatDate(Values[1]);
                                                Search = "TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode + "," + fromDate.trim() + "," + toDate.trim();
                                            } else {
                                                Search = "TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode + "," + fromDate.trim() + "," + fromDate.trim();
                                            }
                                            SearchListScore.push(Search);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    callback(null, SearchListString, SearchLOVString, SearchListScore, SearchLOVScore);
                },
                self.getResult,
                self.getResultLOV,
                function (GuidList, callback) {
                    self.getSearchData(GuidList, VESShortCode, Keyword, callback);
                }
            ], function (err, result) {
                if (err) {
                    return callback(err);
                }
                if (resultArray.length == 0) {
                    resultArray[VESShortCode] = resultArray.concat(result);
                } else {
                    resultArray[VESShortCode] = resultArray[VESShortCode].concat(result);
                }
                return callback(null, result);
            });
        } catch (err) {
            console.log({ details: "SearchTidalPoolHash exception", error: err });
            return callback(err);
        }
    }


    /** 
      * This function is to be called to Search the tidal pool Hash.
      * @returns {undefined} Nothing is returned
      * @function SearchTidalPoolHash
      * @param {ServerObject} request - Incoming server request object
      * @param {ServerObject} reply - Outgoing server reply object
      */
    SearchTidalPoolHash(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);

                if (!payload) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                var VESShortCode = payload.VESShortCode;
                var Keyword = payload.Keyword;
                var resultArray = [];

                self.SearchTPHash(VESShortCode, Keyword, payload, resultArray, function (err, result) {
                    if (err) {
                        retJSON.Status = "false";
                        retJSON.Message = err;
                    } else {
                        retJSON.Status = "true";
                        retJSON.Message = "Success";
                        retJSON.TotalCount = result.length;
                        retJSON.items = result;
                    }
                    return resolve(retJSON);
                });
            } catch (err) {
                retJSON.Status = "false";
                retJSON.Message = err;
                console.log({ details: "SearchTidalPoolHash exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    /** 
     * This function is to be called to get all the Result from redis hash values
     * @returns {JSON} JSON is returned
     * @function getHashAll
     * @param {string} Hash - Hash
     * @param {Object} callback - It is a callback function
     */
    getHashAll(Hash, callback) {
        var self = this;
        try {
            if (self.RedisConnected) {
                redisClient.hgetall(Hash, function (err, res) {
                    if (err) {
                        return callback(err);
                    }
                    if (res) {
                        return callback(null, res);
                    }
                    return callback('Hash not found in Redis');
                });
            } else {
                return callback('Redis connection problem');
            }
        } catch (err) {
            console.log({ details: "getHashAll exception", error: err });
            return callback(err);
        }
    }

    /** 
     * This function is to be called to get TidalPool Schema.
     * @returns {JSON} TidalPool Schema JSON is returned
     * @function GetTidalPoolSchema
     * @param {ServerObject} request - Incoming server request object
     * @param {ServerObject} reply - Outgoing server reply object
     */
    GetTidalPoolSchema(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            var items = [];
            try {
                var payload = self.getPayloadData(postData);

                if (!payload) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                var VESShortCode = "", Keyword = "", Guid = '';
                var missingMandatoryKeys = "";
                if (payload.VESShortCode) {
                    VESShortCode = payload.VESShortCode.toString();
                } else {
                    missingMandatoryKeys = "VESShortCode";
                }

                if (payload.Keyword) {
                    Keyword = payload.Keyword.toString();
                }
                if (payload.Guid) {
                    Guid = payload.Guid.toString();
                }

                if (missingMandatoryKeys != "") {
                    retJSON.Status = "false";
                    retJSON.Message = "missingMandatoryKeys : " + missingMandatoryKeys;
                    console.log({ details: "GetTidalPoolSchema missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }

                if (self.RedisConnected) {
                    async.waterfall([
                        function (callback) {
                            if (Guid) {
                                redisClient.sismember("TpSchemaSet:" + VESShortCode, Guid, function (err, res) {
                                    if (err) {
                                        return callback(err);
                                    }
                                    if (res && res == 1) {
                                        return callback(null, [Guid]);
                                    }
                                    return callback('Posted VESShortCode not found in TpSchemaSet');
                                });
                            } else {
                                redisClient.smembers("TpSchemaSet:" + VESShortCode, function (err, res) {
                                    if (err) {
                                        return callback(err);
                                    }
                                    if (res) {
                                        return callback(null, res);
                                    }
                                    return callback('Posted VESShortCode not found in TpSchemaSet');
                                });
                            }
                        },
                        function (GuidList, callback) {
                            if (Keyword) {
                                async.forEachOf(GuidList, function (Guid, i, callback) {
                                    self.getHash("TpData:" + VESShortCode + ":" + Guid, Keyword, function (err, res) {
                                        if (err) {
                                            console.log({ details: "GetTidalPoolSchema:getHash:Error", error: err });
                                        } else {
                                            var retObj = {};
                                            retObj.Guid = Guid;
                                            retObj.Keyword = Keyword;
                                            retObj.VESData = res;
                                            items.push(retObj);
                                        }
                                        callback(null);
                                    });
                                }, function (err) {
                                    if (err) {
                                        console.log({ details: "GetTidalPoolSchema exception", error: err });
                                        return callback(err);
                                    }
                                    return callback(null);
                                });
                            } else {
                                async.forEachOf(GuidList, function (Guid, i, callback) {
                                    self.getHashAll("TpData:" + VESShortCode + ":" + Guid, function (err, res) {
                                        if (err) {
                                            console.log({ details: "GetTidalPoolSchema:getHashAll:Error", error: err });
                                        } else if (res) {
                                            var keys = Object.keys(res);
                                            for (var i = 0; i < keys.length; i++) {
                                                var retObj = {};
                                                var Keyword = keys[i];
                                                var MetaData = res[keys[i]];
                                                retObj.Guid = Guid;
                                                retObj.Keyword = Keyword;
                                                retObj.VESData = MetaData;
                                                items.push(retObj);
                                            }
                                        }
                                        callback(null);
                                    });

                                }, function (err) {
                                    if (err) {
                                        console.log({ details: "GetTidalPoolSchema exception", error: err });
                                        return callback(err);
                                    }
                                    return callback(null);
                                });
                            }
                        }
                    ], function (err) {
                        if (err) {
                            retJSON.Status = "false";
                            retJSON.Message = err;
                        } else {
                            retJSON.Status = "true";
                            retJSON.Message = "Success";
                            retJSON.items = items;
                        }
                        return resolve(retJSON);
                    });

                } else {
                    retJSON.Status = "false";
                    retJSON.Message = "Redis connection problem";
                    console.log({ details: "GetTidalPoolSchema", error: retJSON });
                    return resolve(retJSON);
                }
            } catch (err) {
                retJSON.Status = "false";
                retJSON.Message = err;
                console.log({ details: "GetTidalPoolSchema exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    /**
     * This function is to be called to archive the VES Data.
     * @returns {undefined} Nothing is returned
     * @function snapShotVESData
     * @param  {String} VESShortCode - VESShortCode
     * @param  {GUID} Guid - Guid
     * @param  {String} Tag - Tag
     * @param  {String} Comment - Comment
     * @param  {String} Action - Action
     * @param  {function} callback - callback
     */
    snapShotVESData(VESShortCode, Guid, Tag, Comment, Action, callback) {
        try {
            var self = this;
            if (self.RedisConnected) {
                async.waterfall([
                    function (callback) {
                        self.getHashAll("TpData:" + VESShortCode + ":" + Guid, function (err, res) {
                            if (err) {
                                console.log({ details: "SnapshotTidalPoolData:getHashAll:Error", error: err });
                                return callback(err);
                            } else if (res) {
                                res.Tag = Tag;
                                res.Comment = Comment;
                                res.Action = Action;
                                return callback(null, res);
                            }
                            return callback('Hash key not found in Redis');
                        });
                    },
                    function (DataHash, callback) {
                        redisClient.zrevrangebyscore("TpDataArchive:" + VESShortCode + ":" + Guid, '+inf', '-inf', 'WITHSCORES', 'LIMIT', '0', '1', function (err, res) {
                            if (err) {
                                console.log({ details: "SnapshotTidalPoolData:zrevrangebyscore:Error", error: err });
                                return callback(err);
                            } else if (res) {
                                var Version = "";
                                if (res && res.length > 0) {
                                    Version = parseInt(res[1]) + 1;
                                } else {
                                    Version = 1;
                                }
                                DataHash.Version = Version.toString();
                                return callback(null, Version, DataHash);
                            }
                            return callback('Hash key not found in Redis');
                        });
                    },
                    function (Version, InDataHash, callback) {
                        var DataHash = '';
                        DataHash = (typeof (InDataHash) == "string") ? InDataHash : JSON.stringify(InDataHash);
                        redisClient.zadd("TpDataArchive:" + VESShortCode + ":" + Guid, Version, DataHash);
                        return callback(null, Version);
                    }
                ], function (err, result) {
                    if (err) {
                        console.log({ details: "SnapshotTidalPoolData:Error", error: err });
                        return callback(err);
                    }
                    return callback(null, result);
                });

            } else {
                console.log({ details: "SnapshotTidalPoolData ", error: "Redis connection problem" });
                return callback("Redis connection problem");
            }
        } catch (exp) {
            console.log({ details: "SnapshotTidalPoolData Exception", error: exp });
            return callback(exp);
        }
    }

    /**
        * This function is to be called to archive the VES Data.
        * @returns {undefined} Nothing is returned
        * @function SnapshotTidalPoolData
        * @param {ServerObject} request - Incoming server request object
        * @param {ServerObject} reply - Outgoing server reply object
        */
    SnapshotTidalPoolData(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);

                if (!payload) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                var VESShortCode = "", Guid = "", Tag = "", Comment = "", Action = "Snapshot";
                var missingMandatoryKeys = "";
                if (payload.VESShortCode) {
                    VESShortCode = payload.VESShortCode.toString();
                } else {
                    missingMandatoryKeys = "VESShortCode";
                }
                if (payload.Guid) {
                    Guid = payload.Guid.toString();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "Guid" : missingMandatoryKeys + ", Guid");
                }
                Tag = payload.Tag;
                Comment = payload.Comment;

                if (missingMandatoryKeys != "") {
                    retJSON.Status = "false";
                    retJSON.Message = "missingMandatoryKeys : " + missingMandatoryKeys;
                    console.log({ details: "SnapshotTidalPoolData missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }

                self.snapShotVESData(VESShortCode, Guid, Tag, Comment, Action, function (err, res) {
                    if (err) {
                        retJSON.Status = "false";
                        retJSON.Message = err;
                    } else {
                        retJSON.Status = "true";
                        retJSON.Message = "Success";
                        retJSON.Version = res.toString();
                    }
                    return resolve(retJSON);
                });

            } catch (err) {
                retJSON.Status = "false";
                retJSON.Message = err;
                console.log({ details: "SnapshotTidalPoolData exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    /**
     * This function is to be called to remove VES Data.
     * @returns {undefined} Nothing is returned
     * @function removeTidalPoolData
     * @param {string} _VESShortCode - VESShortCode
     * @param {string} _Guid - Guid
     * @param {string} _Keyword - Keyword
     * @param {string} _MetaData - _MetaData
     * @param {Object} callback - Incoming callback function
     */
    removeDataHash(_VESShortCode, _Guid, _Keyword, _MetaData, callback) {
        try {
            var self = this;
            var VESShortCode = "", Guid = "", Keyword = "", MetaData = "";
            var missingMandatoryKeys = "";
            if (_VESShortCode) {
                VESShortCode = _VESShortCode.toString();
            } else {
                missingMandatoryKeys = "VESShortCode";
            }
            if (_Guid) {
                Guid = _Guid.toString();
            } else {
                missingMandatoryKeys = (missingMandatoryKeys == "" ? "Guid" : missingMandatoryKeys + ", Guid");
            }
            if (_Keyword) {
                Keyword = _Keyword.toString();
            } else {
                missingMandatoryKeys = (missingMandatoryKeys == "" ? "Keyword" : missingMandatoryKeys + ", Keyword");
            }
            if (_MetaData) {
                MetaData = _MetaData.toString();
            } else {
                missingMandatoryKeys = (missingMandatoryKeys == "" ? "MetaData" : missingMandatoryKeys + ", MetaData");
            }

            if (missingMandatoryKeys != "") {
                console.log({ details: "removeTidalPoolData missingMandatoryKeys", error: missingMandatoryKeys });
                return callback("missingMandatoryKeys : " + missingMandatoryKeys);
            }
            if (self.RedisConnected) {
                async.waterfall([
                    function (callback) {
                        self.getHash("TpSearchHash:" + VESShortCode, Keyword, function (err, res) {
                            if (err) {
                                console.log({ details: "removeTidalPoolData TpSearchHash getHash", error: err });
                                return callback(err);
                            }
                            var response = '';
                            try {
                                response = (typeof (res) == "string") ? JSON.parse(res) : res;
                            } catch (exp) {
                                console.log({ details: "removeTidalPoolData TpSearchHash response parse : ", error: exp });
                                return callback(exp);
                            }
                            return callback(null, response, MetaData);
                        });
                    },
                    function (InSearchHash, InMetaData, callback) {
                        var MetaData = '', searchHash = '';
                        try {
                            MetaData = (typeof (InMetaData) == "string") ? JSON.parse(InMetaData) : InMetaData;
                            searchHash = (typeof (InSearchHash) == "string") ? JSON.parse(InSearchHash) : InSearchHash;
                        } catch (err) {
                            console.log({ details: "removeTidalPoolData MetaData parse : ", error: err });
                            return callback(err);
                        }
                        for (var HashInfo of searchHash) {
                            if (HashInfo && HashInfo.sc) {
                                var ShortCode = HashInfo.sc;
                                var type = HashInfo.type;
                                traverse(MetaData).forEach(function (Value) {
                                    if (this.key != "undefined" && this.key == ShortCode) {
                                        if (type == "string") {
                                            redisClient.srem("TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + ShortCode + ":" + Value, Guid);
                                        } else if (type == "integer" || type == "date") {
                                            redisClient.zrem("TpSearchSet:" + VESShortCode + ":" + Keyword + ":" + ShortCode, Guid);
                                        }
                                        this.stop();
                                    }
                                });
                            }
                        }
                        return callback(null);
                    }
                ], function (err) {
                    if (err) {
                        console.log(err);
                        return callback(null);
                    }
                    return callback(null);
                });

            } else {
                console.log({ details: "removeTidalPoolData ", error: "Redis connection problem" });
                return callback("Redis connection problem");
            }
        } catch (err) {
            console.log({ details: "removeTidalPoolData exception", error: err });
            return callback(err);
        }
    }

    /**
        * This function is to be called to remove VES Data.
        * @returns {undefined} Nothing is returned
        * @function RemoveTidalPoolData
        * @param {ServerObject} request - Incoming server request object
        * @param {ServerObject} reply - Outgoing server reply object
        */
    RemoveTidalPoolData(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);

                if (!payload) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                var VESShortCode = "", Guid = "", Tag = "", Comment = "", Action = "", Keyword = "";
                var missingMandatoryKeys = "";
                if (payload.VESShortCode) {
                    VESShortCode = payload.VESShortCode.toString();
                } else {
                    missingMandatoryKeys = "VESShortCode";
                }
                if (payload.Guid) {
                    Guid = payload.Guid.toString();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "Guid" : missingMandatoryKeys + ", Guid");
                }
                if (payload.Keyword) {
                    Keyword = payload.Keyword.toString();
                    Action = "Remove - keyword - " + payload.Keyword.toString();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "Keyword" : missingMandatoryKeys + ", Keyword");
                }

                if (missingMandatoryKeys != "") {
                    retJSON.Status = "false";
                    retJSON.Message = "missingMandatoryKeys : " + missingMandatoryKeys;
                    console.log({ details: "RemoveTidalPoolData missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }
                if (self.RedisConnected) {
                    async.waterfall([
                        function (callback) {
                            self.snapShotVESData(VESShortCode, Guid, Tag, Comment, Action, callback);
                        },
                        function (Version, callback) {
                            self.getHash("TpData:" + VESShortCode + ":" + Guid, Keyword, function (err, res) {
                                if (err) {
                                    console.log({ details: "removeTidalPoolData:getHash:Error", error: err });
                                    return callback(err);
                                } else if (res) {
                                    redisClient.hdel("TpData:" + VESShortCode + ":" + Guid, Keyword);
                                    return callback(null, res);
                                }
                                return callback('Hash key not found in Redis');
                            });
                        },
                        function (MetaData, callback) {
                            self.removeDataHash(VESShortCode, Guid, Keyword, MetaData, callback);
                        }
                    ], function (err) {
                        if (err) {
                            retJSON.Status = "false";
                            retJSON.Message = err;
                        } else {
                            retJSON.Status = "true";
                            retJSON.Message = "Success";
                        }
                        return resolve(retJSON);
                    });

                } else {
                    retJSON.Status = "false";
                    retJSON.Message = "Redis connection problem";
                    console.log({ details: "RemoveTidalPoolData ", error: "Redis connection problem" });
                    return resolve(retJSON);
                }
            } catch (err) {
                retJSON.Status = "false";
                retJSON.Message = err;
                console.log({ details: "RemoveTidalPoolData exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    /**
     * This function is to be called to checkTPData
     * @returns {Boolean} Boolean is returned
     * @function checkTPData
     * @param  {String} VESShortCode - VESShortCode
     * @param  {GUID} Guid - Guid
     * @param  {String} Tag - Tag
     * @param  {String} Comment - Comment
     * @param  {String} Action - Action
     * @param  {String} RollbackVersion - RollbackVersion
     * @param  {function} callback - callback
     */
    checkTPData(VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, self, callback) {
        try {
            if (self.RedisConnected) {
                redisClient.hgetall("TpData:" + VESShortCode + ":" + Guid, function (err, res) {
                    if (err) {
                        return callback(err);
                    }
                    if (res) {
                        return callback(null, true);
                    }
                    return callback(null, false);
                });
            } else {
                return callback('Redis connection problem');
            }
        } catch (exp) {
            console.log({ details: "getHashAll exception", error: exp });
            return callback(exp);
        }
    }

    snapShotTPData(VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, self, callback) {
        try {
            async.waterfall([
                function (callback) {
                    self.snapShotVESData(VESShortCode, Guid, Tag, Comment, Action, callback);
                },
                function (Version, callback) {
                    self.getHashAll("TpData:" + VESShortCode + ":" + Guid, function (err, res) {
                        if (err) {
                            console.log({ details: "RollbackTidalPoolData, snapShotTPData:getHashAll:Error", error: err });
                            return callback(err);
                        } else if (res) {
                            var items = [];
                            var keys = Object.keys(res);
                            for (var i = 0; i < keys.length; i++) {
                                var retObj = {};
                                var Keyword = keys[i];
                                var MetaData = res[keys[i]];
                                retObj.VESShortCode = VESShortCode;
                                retObj.Guid = Guid;
                                retObj.Keyword = Keyword;
                                retObj.MetaData = MetaData;
                                items.push(retObj);
                            }
                            return callback(null, items);
                        }
                        return callback('Hash Key not found in Redis');
                    });
                },
                function (DataItems, callback) {
                    async.forEachOf(DataItems, function (item, i, callback) {
                        self.removeDataHash(item.VESShortCode, item.Guid, item.Keyword, item.MetaData, function (err) {
                            if (err) {
                                console.log({ details: "RollbackTidalPoolData, snapShotTPData:removeTidalPoolData:Error", error: err });
                            }
                            callback(null);
                        });
                    }, function (err) {
                        if (err) {
                            console.log({ details: "RollbackTidalPoolData, snapShotTPData forEachOf Error", error: err });
                            return callback(err);
                        }
                        redisClient.del("TpData:" + VESShortCode + ":" + Guid);
                        return callback(null);
                    });
                }
            ], function (err) {
                if (err) {
                    console.log({ details: "RollbackTidalPoolData, snapShotTPData Error", error: err });
                    return callback(err);
                }
                return callback(null, VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, self);
            });
        } catch (error) {
            console.log({ details: "RollbackTidalPoolData,snapShotTPData Exception", error: error });
            return callback(error);
        }
    }

    rollbackTPData(VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, self, callback) {
        try {
            async.waterfall([
                function (callback) {
                    redisClient.zrangebyscore("TpDataArchive:" + VESShortCode + ":" + Guid, RollbackVersion, RollbackVersion, function (err, res) {
                        if (err) {
                            console.log({ details: "RollbackTidalPoolData zrangebyscore Error", error: err });
                            return callback(err);
                        } else if (res) {
                            var response = '';
                            try {
                                response = (typeof (res[0]) == "string") ? JSON.parse(res[0]) : res[0];
                            } catch (exp) {
                                console.log({ details: "RollbackTidalPoolData res parse : ", error: exp });
                                return callback(exp);
                            }
                            if (!response) {
                                return callback('No Backup Data Found to Rollback for the given Shortcode/GUID/Version combination.');
                            }
                            Reflect.deleteProperty(response, 'Tag');
                            Reflect.deleteProperty(response, 'Comment');
                            Reflect.deleteProperty(response, 'Action');
                            Reflect.deleteProperty(response, 'Version');
                            // delete response['Tag']; delete response['Comment']; delete response['Action']; delete response['Version'];
                            var items = [];
                            var keys = Object.keys(response);
                            for (var i = 0; i < keys.length; i++) {
                                var retObj = {};
                                var Keyword = keys[i];
                                var MetaData = response[keys[i]];
                                retObj.VESShortCode = VESShortCode;
                                retObj.Guid = Guid;
                                retObj.Keyword = Keyword;
                                retObj.MetaData = MetaData;
                                items.push(retObj);
                            }
                            return callback(null, items);
                        }
                        return callback('Hash Key not found in Redis zrangebyscore');
                    });
                },
                function (DataItems, callback) {
                    async.forEachOf(DataItems, function (item, i, callback) {
                        self.populateTPSearchSet(item.VESShortCode, item.Guid, item.Keyword, item.MetaData, null, function (err) {
                            if (err) {
                                console.log({ details: "RollbackTidalPoolData forEachOf Error", error: err });
                            }
                            return callback(null);
                        });
                    }, function (err) {
                        if (err) {
                            console.log({ details: "RollbackTidalPoolData forEachOf Error", error: err });
                            return callback(err);
                        }
                        return callback(null);
                    });
                }
            ], function (err) {
                if (err) {
                    console.log({ details: "RollbackTidalPoolData forEachOf Error", error: err });
                    return callback(err);
                }
                return callback(null);
            });
        } catch (error) {
            console.log({ details: "RollbackTidalPoolData forEachOf Error", error: error });
            return callback(error);
        }
    }

    /**
        * This function is to be called to rollback VES Data.
        * @returns {undefined} Nothing is returned
        * @function RollbackTidalPoolData
        * @param {ServerObject} request - Incoming server request object
        * @param {ServerObject} reply - Outgoing server reply object
        */
    RollbackTidalPoolData(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);

                if (!payload) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                var VESShortCode = "", Guid = "", Tag = "", Comment = "", RollbackVersion = "", Action = "";
                var missingMandatoryKeys = "";
                if (payload.VESShortCode) {
                    VESShortCode = payload.VESShortCode.toString();
                } else {
                    missingMandatoryKeys = "VESShortCode";
                }
                if (payload.Guid) {
                    Guid = payload.Guid.toString();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "Guid" : missingMandatoryKeys + ", Guid");
                }
                if (payload.Version) {
                    RollbackVersion = payload.Version.toString();
                    Action = "Rollback - " + RollbackVersion;
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "Version" : missingMandatoryKeys + ", Version");
                }

                if (missingMandatoryKeys != "") {
                    retJSON.Status = "false";
                    retJSON.Message = "missingMandatoryKeys : " + missingMandatoryKeys;
                    console.log({ details: "RollbackTidalPoolData missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }
                if (self.RedisConnected) {
                    async.waterfall([
                        async.constant(VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, self),
                        conditional.if(self.checkTPData, self.snapShotTPData),
                        function (VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, asyncself, callback) {
                            self.rollbackTPData(VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, asyncself, callback);
                        }
                    ], function (err) {
                        if (err) {
                            console.log({ details: "RollbackTidalPoolData Error", error: err });
                            retJSON.Status = "false";
                            retJSON.Message = err;
                        } else {
                            retJSON.Status = "true";
                            retJSON.Message = "Success";
                        }
                        return resolve(retJSON);
                    });
                } else {
                    retJSON.Status = "false";
                    retJSON.Message = "Redis connection problem";
                    console.log({ details: "RollbackTidalPoolData ", error: "Redis connection problem" });
                    return resolve(retJSON);
                }
            } catch (err) {
                retJSON.Status = "false";
                retJSON.Message = err;
                console.log({ details: "RollbackTidalPoolData exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    /**
        * This function is to be called to update VES data and Search Sets.
        * @returns {undefined} Nothing is returned
        * @function UpdateTidalPoolHash
        * @param {ServerObject} request - Incoming server request object
        * @param {ServerObject} reply - Outgoing server reply object
        */
    UpdateTidalPoolHash(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);

                if (!payload) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                var Guid = "", VESShortCode = "";
                var missingMandatoryKeys = "";
                if (payload.Guid) {
                    Guid = payload.Guid.toString();
                } else {
                    missingMandatoryKeys = "Guid";
                }
                if (payload.VESShortCode) {
                    VESShortCode = payload.VESShortCode.toString();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "VESShortCode" : missingMandatoryKeys + ", VESShortCode");
                }
                if (missingMandatoryKeys != "") {
                    retJSON.Status = "false";
                    retJSON.Message = "missingMandatoryKeys : " + missingMandatoryKeys;
                    console.log({ details: "RollbackTidalPoolData missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }
                if (self.RedisConnected) {
                    async.waterfall([
                        function (callback) {
                            self.getHashAll("TpData:" + VESShortCode + ":" + Guid, function (err, res) {
                                if (err) {
                                    console.log({ details: "UpdateTidalPoolHash:getHashAll:Error", error: err });
                                    return callback(err);
                                } else if (res) {
                                    var items = [];
                                    var keys = Object.keys(res);
                                    for (var i = 0; i < keys.length; i++) {
                                        var retObj = {};
                                        var Keyword = keys[i];
                                        var MetaData = res[keys[i]];
                                        retObj.VESShortCode = VESShortCode;
                                        retObj.Guid = Guid;
                                        retObj.Keyword = Keyword;
                                        retObj.MetaData = MetaData;
                                        items.push(retObj);
                                    }
                                    return callback(null, items);
                                }
                                return callback('Hash Key not found in Redis');
                            });
                        },
                        function (items, callback) {
                            async.forEachOf(items, function (item, i, callback) {
                                self.populateTPSearchSet(item.VESShortCode, item.Guid, item.Keyword, item.MetaData, 'Refresh', function (err) {
                                    if (err) {
                                        console.log({ details: "UpdateTidalPoolHash:populateTPSearchSet:Error", error: err });
                                        return callback(err);
                                    }
                                    callback(null);
                                });
                            }, function (err) {
                                if (err) {
                                    console.log({ details: "UpdateTidalPoolHash forEachOf exception", error: err });
                                    return callback(err);
                                }
                                return callback(null);
                            });
                        }
                    ], function (err) {
                        if (err) {
                            console.log({ details: "UpdateTidalPoolHash waterfall", error: err });
                            retJSON.Status = "false";
                            retJSON.Message = err;
                        } else {
                            retJSON.Status = "true";
                            retJSON.Message = "Success";
                        }
                        return resolve(retJSON);
                    });
                } else {
                    console.log({ details: "UpdateTidalPoolHash", error: "Redis connection problem" });
                    retJSON.Status = "false";
                    retJSON.Message = "Redis connection problem";
                    return resolve(retJSON);
                }
            } catch (err) {
                console.log({ details: "UpdateTidalPoolHash exception", error: err });
                retJSON.Status = "false";
                retJSON.Message = err;
                return resolve(retJSON);
            }
        });
    }

    getSchemaList() {
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                redisClient.keys("TpSchemaSet:*", function (err, res) {
                    if (err) {
                        retJSON.Status = 'false';
                        retJSON.Message = err;
                        return resolve(retJSON);
                    }
                    retJSON.Status = 'true';
                    retJSON.Message = 'Success';
                    retJSON = res.toString().replace(/TpSchemaSet:/g, "").
                        split(',');
                    return resolve(retJSON);
                });
            } catch (error) {
                retJSON.Status = "false";
                retJSON.Message = error;
                console.log({ details: "getSchemaList exception", error: error });
                return reject(retJSON);
            }
        });
    }

    GetSearchHashSchema(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);

                var Keyword = "", VESShortCode = "";
                var missingMandatoryKeys = "";
                if (payload.Keyword) {
                    Keyword = payload.Keyword.toString();
                } else {
                    missingMandatoryKeys = "Keyword";
                }
                if (payload.VESShortCode) {
                    VESShortCode = payload.VESShortCode.toString();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "VESShortCode" : missingMandatoryKeys + ", VESShortCode");
                }
                if (missingMandatoryKeys != "") {
                    retJSON.Status = "false";
                    retJSON.Message = "missingMandatoryKeys : " + missingMandatoryKeys;
                    console.log({ details: "RollbackTidalPoolData missingMandatoryKeys", error: missingMandatoryKeys });
                    return reject(retJSON);
                }

                self.getHash("TpSearchHash:" + VESShortCode, Keyword, function (err, res) {
                    if (err) {
                        retJSON.Status = "false";
                        retJSON.Message = err;
                        return resolve(retJSON);
                    }
                    retJSON.Status = "true";
                    retJSON.VESShortCode = VESShortCode;
                    retJSON.Keyword = Keyword;
                    retJSON.SearchHash = JSON.parse(res);
                    return resolve(retJSON);
                });
            } catch (error) {
                console.log(error);
                retJSON.Status = 'false';
                retJSON.Error = error;
                return resolve(retJSON);
            }
        });
    }

    RefreshTidalPoolData(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);

                if (!payload) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                var VESShortCode = "";
                var missingMandatoryKeys = "";

                if (payload.VESShortCode) {
                    VESShortCode = payload.VESShortCode.toString();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "VESShortCode" : missingMandatoryKeys + ", VESShortCode");
                }
                if (missingMandatoryKeys != "") {
                    retJSON.Status = "false";
                    retJSON.Message = "missingMandatoryKeys : " + missingMandatoryKeys;
                    console.log({ details: "RefreshTidalPoolData missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }
                if (self.RedisConnected) {
                    async.waterfall([
                        function (callback) {
                            redisClient.smembers("TpSchemaSet:" + VESShortCode, function (err, res) {
                                if (err) {
                                    console.log({ details: "RefreshTidalPoolData:getHashAll:Error", error: err });
                                    return callback(err);
                                } else if (res) {
                                    return callback(null, res);
                                }
                                return callback('Hash Key not found in Redis');
                            });
                        },
                        function (ScemaItems, callback) {
                            async.forEachOfSeries(ScemaItems, function (Guid, key, callbackeach) {
                                self.getHashAll("TpData:" + VESShortCode + ":" + Guid, function (err, res) {
                                    if (err) {
                                        console.log({ details: "RefreshTidalPoolData:getHashAll:Error", error: err });
                                        return callbackeach(null);
                                    } else if (res) {
                                        var items = [];
                                        var keys = Object.keys(res);
                                        for (var i = 0; i < keys.length; i++) {
                                            var retObj = {};
                                            var Keyword = keys[i];
                                            var MetaData = res[keys[i]];
                                            retObj.VESShortCode = VESShortCode;
                                            retObj.Guid = Guid;
                                            retObj.Keyword = Keyword;
                                            retObj.MetaData = MetaData;
                                            items.push(retObj);
                                        }
                                        async.forEachOf(items, function (item, i, callbackOf) {
                                            self.populateTPSearchSet(item.VESShortCode, item.Guid, item.Keyword, item.MetaData, 'Refresh', function (err) {
                                                if (err) {
                                                    console.log({ details: "RefreshTidalPoolData:populateTPSearchSet:Error", error: err });
                                                    return callbackOf(err);
                                                }
                                                callbackOf(null);
                                            });
                                        }, function (err) {
                                            if (err) {
                                                console.log({ details: "RefreshTidalPoolData forEachOf exception", error: err });
                                                return callbackeach(err);
                                            }
                                            return callbackeach(null);
                                        });
                                    } else {
                                        return callbackeach(null);
                                    }
                                });
                            }, function (err) {
                                if (err) {
                                    console.log({ details: "RefreshTidalPoolData:getHashAll:Error", error: err });
                                    return callback(err);
                                }
                                return callback(null);
                            });
                        }
                    ], function (err) {
                        if (err) {
                            console.log({ details: "RefreshTidalPoolData waterfall", error: err });
                            retJSON.Status = "false";
                            retJSON.Message = err;
                        } else {
                            retJSON.Status = "true";
                            retJSON.Message = "Success";
                        }
                        return resolve(retJSON);
                    });
                } else {
                    console.log({ details: "RefreshTidalPoolData", error: "Redis connection problem" });
                    retJSON.Status = "false";
                    retJSON.Message = "Redis connection problem";
                    return resolve(retJSON);
                }
            } catch (err) {
                console.log({ details: "RefreshTidalPoolData exception", error: err });
                retJSON.Status = "false";
                retJSON.Message = err;
                return resolve(retJSON);
            }
        });
    }

    InsertData(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);

                if (!payload.VESShortCode) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }
                var newMetaData = "";
                if (payload.Certificate) {
                    var certificate = payload.Certificate;
                    try {
                        var certStr = ByteBuffer.atob(certificate.replace("BEGIN CERTIFICATE--- ", "").replace(" ---END CERTIFICATE", ""));
                        newMetaData = certStr;
                    } catch (err) {
                        console.log(err);
                        console.log({ details: "InsertTPData atob certificate exception", error: err });
                        return reject({ Status: false, Message: 'Invalid certificate Postdata' });
                    }
                }

                var Guid = "", VESShortCode = "", Keyword = "", MetaData = {}, Tag = '', Comment = '', Action = 'Update';
                var missingMandatoryKeys = "";
                if (payload.Guid) {
                    Guid = payload.Guid.toString().trim();
                } else {
                    Guid = null;
                }
                if (payload.VESShortCode) {
                    VESShortCode = payload.VESShortCode.toString().trim();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "VESShortCode" : missingMandatoryKeys + ", VESShortCode");
                }
                if (payload.Keyword) {
                    Keyword = payload.Keyword.toString().trim();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "Keyword" : missingMandatoryKeys + ", Keyword");
                }
                if (payload.MetaData) {
                    MetaData = payload.MetaData.toString().trim();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "MetaData" : missingMandatoryKeys + ", MetaData");
                }

                if (newMetaData) {
                    console.log("Got A Certificate MetaData");
                    MetaData = newMetaData;
                    // Add Logic to replace MetaData with newMetaData if it exists
                }
                if (missingMandatoryKeys != "") {
                    retJSON.Status = "false";
                    retJSON.Message = "missingMandatoryKeys : " + missingMandatoryKeys;
                    console.log({ details: "InsertTPData missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }

                async.waterfall([
                    function (callback) {
                        self.CreateTPGUID(VESShortCode, Guid, callback);
                    },
                    function (insertId, callback) {
                        self.dataInsert(VESShortCode, insertId, Keyword, MetaData, Tag, Comment, Action, retJSON, callback);
                    }
                ], function (err, result) {
                    if (err) {
                        console.log(err);
                        return reject(err);
                    }
                    console.log(result);
                    return resolve(result);
                });
            } catch (error) {
                console.log(error);
                retJSON.Status = "false";
                retJSON.Message = error;
                console.log({ details: "InsertTPData exception", error: error });
                return resolve(retJSON);
            }
        });
    }

    GetTpSearchHash(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);
                var Keyword = "",
                    VESShortCode = "";
                var missingMandatoryKeys = "";
                if (payload.Keyword) {
                    Keyword = payload.Keyword.toString();
                } else {
                    missingMandatoryKeys = "Keyword";
                }
                if (payload.VESShortCode) {
                    VESShortCode = payload.VESShortCode.toString();
                } else {
                    missingMandatoryKeys = (missingMandatoryKeys == "" ? "VESShortCode" : missingMandatoryKeys + ", VESShortCode");
                }
                if (missingMandatoryKeys != "") {
                    retJSON.Status = "false";
                    retJSON.Message = "missingMandatoryKeys : " + missingMandatoryKeys;
                    console.log({ details: "RollbackTidalPoolData missingMandatoryKeys", error: missingMandatoryKeys });
                    return reject(retJSON);
                }

                self.getHash("TpSearchHash:" + VESShortCode, Keyword, function (err, res) {
                    if (err) {
                        retJSON.Status = "false";
                        retJSON.Message = err;
                        console.log({ details: "GetTpSearchHash:getHash Error", error: err });
                    } else {
                        retJSON.Status = "true";
                        retJSON.Message = "Success";
                        retJSON.items = JSON.parse(res);
                    }
                    console.log('retJSON: ', retJSON);
                    return resolve(retJSON);
                });
            } catch (error) {
                retJSON.Status = "false";
                retJSON.Message = error;
                console.log({ details: "GetTpSearchHash exception", error: retJSON });
                return reject(retJSON);
            }
        });
    }

    getAllSchemaData(VESShortCode, Guid, Keyword, items, callback) {
        // var retJSON = {};
        var self = this;
        async.waterfall([
            function (callback) {
                if (Guid) {
                    redisClient.sismember("TpSchemaSet:" + VESShortCode, Guid, function (err, res) {
                        if (err) {
                            return callback(err);
                        }
                        if (res && res == 1) {
                            return callback(null, [Guid]);
                        }
                        return callback('Posted VESShortCode not found in TpSchemaSet');
                    });
                } else {
                    redisClient.smembers("TpSchemaSet:" + VESShortCode, function (err, res) {
                        if (err) {
                            return callback(err);
                        }
                        if (res) {
                            return callback(null, res);
                        }
                        return callback('Posted VESShortCode not found in TpSchemaSet');
                    });
                }
            },
            function (GuidList, callback) {
                if (Keyword) {
                    async.forEachOf(GuidList, function (Guid, i, callback) {
                        self.getHash("TpData:" + VESShortCode + ":" + Guid, Keyword, function (err, res) {
                            if (err) {
                                console.log({ details: "GetTidalPoolSchema:getHash:Error", error: err });
                            } else {
                                var retObj = {};
                                retObj.Guid = Guid;
                                retObj.Keyword = Keyword;
                                retObj.VESData = res;
                                if (items.length == 0) {
                                    if (items[VESShortCode]) {
                                        items[VESShortCode] = items[VESShortCode].concat(retObj);
                                    } else {
                                        items[VESShortCode] = items.concat(retObj);
                                    }
                                } else {
                                    items[VESShortCode] = items[VESShortCode].concat(retObj);
                                }
                            }
                            callback(null);
                        });
                    }, function (err) {
                        if (err) {
                            console.log({ details: "GetTidalPoolSchema exception", error: err });
                            return callback(err);
                        }
                        return callback(null);
                    });
                } else {
                    async.forEachOf(GuidList, function (Guid, i, callback) {
                        self.getHashAll("TpData:" + VESShortCode + ":" + Guid, function (err, res) {
                            if (err) {
                                console.log({ details: "GetTidalPoolSchema:getHashAll:Error", error: err });
                            } else if (res) {
                                var keys = Object.keys(res);
                                for (var i = 0; i < keys.length; i++) {
                                    var retObj = {};
                                    var Keyword = keys[i];
                                    var MetaData = res[keys[i]];
                                    retObj.Guid = Guid;
                                    retObj.Keyword = Keyword;
                                    retObj.VESData = MetaData;
                                    if (items.length == 0) {
                                        if (items[VESShortCode]) {
                                            items[VESShortCode] = items[VESShortCode].concat(retObj);
                                        } else {
                                            items[VESShortCode] = items.concat(retObj);
                                        }
                                    } else {
                                        items[VESShortCode] = items[VESShortCode].concat(retObj);
                                    }
                                }
                            }
                            callback(null);
                        });

                    }, function (err) {
                        if (err) {
                            console.log({ details: "GetTidalPoolSchema exception", error: err });
                            return callback(err);
                        }
                        return callback(null);
                    });
                }
            }
        ], function (err) {
            if (err) {
                return callback(null, err);
            }
            return callback(null);
        });
    }

    GetDatafromSchemas(postData) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var retJSON = {};
            try {
                var payload = self.getPayloadData(postData);
                if (!payload) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }
                const Schema = (payload.Schema.indexOf(',') > -1) ? payload.Schema.split(',') : [payload.Schema];
                const Keyword = payload.Keyword ? payload.Keyword : 'Label';
                const Guid = payload.Guid ? payload.Guid : null;
                let PropertyFields = [];
                let PropertyValue = [];
                if (payload.PropertyField) {
                    PropertyFields = Array.isArray(payload.PropertyField) ? payload.PropertyField : [payload.PropertyField];
                } else {
                    PropertyFields = null;
                }
                if (payload.PropertyValue) {
                    PropertyValue = Array.isArray(payload.PropertyValue) ? payload.PropertyValue : [payload.PropertyValue];
                } else {
                    PropertyValue = null;
                }
                var newPayload = {
                    VESShortCode: Schema,
                    Keyword: Keyword
                };
                for (var PropertyField in PropertyFields) {
                    if (PropertyFields[PropertyField]) {
                        newPayload[PropertyFields[PropertyField]] = PropertyValue[PropertyField];
                    }
                }
                var forDeletion = ['Schema', 'Keyword', 'Guid'];
                var arr = Object.keys(payload).filter((item) => !forDeletion.includes(item));
                var resultArray = [];
                if (arr.length > 0 && Guid === null) {
                    async.forEachOfSeries(Schema, function (Shortcode, key, callbackeach) {
                        self.SearchTPHash(Shortcode, Keyword, newPayload, resultArray, callbackeach);
                    }, function (err) {
                        if (err) {
                            retJSON.Status = "false";
                            retJSON.Message = err;
                        } else {
                            retJSON.Status = "true";
                            retJSON.Message = "Success";
                            retJSON.items = Object.assign({}, resultArray);
                        }
                        return resolve(retJSON);
                    });
                } else if (arr.length === 0) {
                    async.forEachOfSeries(Schema, function (Shortcode, key, callbackeach) {
                        self.getAllSchemaData(Shortcode, Guid, Keyword, resultArray, callbackeach);
                    }, function (err) {
                        if (err) {
                            retJSON.Status = "false";
                            retJSON.Message = err;
                        } else {
                            retJSON.Status = "true";
                            retJSON.Message = "Success";
                            retJSON.items = Object.assign({}, resultArray);
                        }
                        return resolve(retJSON);
                    });
                } else {
                    retJSON.Status = "false";
                    retJSON.Message = 'Please Change Search Post Data combination either (Guid only) or (' + arr.join(' and ') + ')';
                    return resolve(retJSON);
                }

            } catch (error) {
                retJSON.Status = "false";
                retJSON.Message = error;
                console.log(retJSON);
                return resolve(retJSON);
            }
        });
    }

};
