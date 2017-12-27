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
    CreateConnection(ConnectionObj) {
        return new Promise((resolve, reject) => {
            let client = {};

            if (!ConnectionObj) {
                return reject({ Status: false, Message: 'No Connection Object Found' });
            }
            client = redis.createClient(ConnectionObj);
            client.on('connect', () => {
                console.log("redis Connected");

                client.select(ConnectionObj.dbname, () => {
                    console.log("Redis db " + ConnectionObj.dbname + " selected");
                    redisClient = client;
                    this.RedisConnected = true;
                    return resolve();
                });
            });
            client.on('error', (err) => reject(err));
        });
    }
    CloseConnection() {
        redisClient.quit();
        this.RedisConnected = false;
    }
    ListSchemas() {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                if (this.RedisConnected) {
                    redisClient.keys("Master:*", (err, res) => {
                        if (err) {
                            retJSON.Status = 'false';
                            retJSON.Message = err;
                            return resolve(retJSON);
                        }
                        retJSON.Status = 'true';
                        retJSON.Message = 'Success';
                        retJSON.items = res.toString().replace(/Master:/g, "").
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
                console.log({ details: "ListSchemas exception", error: error });
                return reject(retJSON);
            }
        });
    }
    SetCacheData(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                if (this.RedisConnected) {
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
    GetCacheData(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                var Hash = postData ? postData.Schema : '';
                if (this.RedisConnected) {
                    redisClient.hgetall(Hash, (err, response) => {
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
    ShowConnectionStatus() {
        return new Promise((resolve, reject) => {
            if (this.RedisConnected) {
                return resolve({
                    Status: 'TP Redis Module Loaded and Ready to Rock and Roll...',
                    Message: 'DataLake - Licensed by SkunkworxLab, LLC.'
                });
            }
            return reject({
                Status: false,
                Message: 'Redis not Connected'
            });
        });
    }

    CreateTPGUID(VESShortCode, Guid, callback) {
        var myUUID = Guid ? Guid : uuid.v4();
        try {
            if (this.RedisConnected) {
                redisClient.sadd('Master:' + VESShortCode, myUUID);
            } else {
                console.log({ details: 'CreateTPGUID', error: 'Redis connection problem' });
                return callback({ error: 'Redis connection problem' });
            }
            return callback(null, myUUID);
        } catch (err) {
            console.log({ details: 'CreateTPGUID exception', error: err });
            return callback(null, myUUID);
        }
    }

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

    CreateSchema(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                var payload = this.getPayloadData(postData);

                if (!payload.VESShortCode) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                this.CreateTPGUID(payload.VESShortCode, payload.Guid ? payload.Guid : null, (err, Guid) => {
                    if (err) {
                        console.log('redis not connected');
                        console.log({ details: "CreateSchema", error: retJSON });
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
                console.log({ details: "CreateSchema exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    SetupSearchIndex(VESShortCode, Keyword, ShortCodes) {
        try {
            if (this.RedisConnected) {
                redisClient.hset("Index:" + VESShortCode, Keyword, ShortCodes);
            } else {
                console.log({ details: "SetupSearchIndex", error: "Redis connection problem" });
            }
        } catch (err) {
            console.log({ details: "SetupSearchIndex exception", error: err });
        }
    }

    ConfigureSearchIndex(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                var payload = this.getPayloadData(postData);

                if (!payload.ShortCodes) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                if (this.RedisConnected) {
                    var ShortCodes = (typeof (payload.ShortCodes) == "string") ? payload.ShortCodes : JSON.stringify(payload.ShortCodes);
                    this.SetupSearchIndex(payload.VESShortCode, payload.Keyword, ShortCodes);
                    retJSON.Status = "true";
                    retJSON.Message = "Success";
                } else {
                    retJSON.Status = "false";
                    retJSON.Message = "Redis connection problem";
                    console.log({ details: "ConfigureSearchIndex", error: retJSON });
                }
                return resolve(retJSON);
            } catch (err) {
                retJSON.Status = "false";
                retJSON.Message = err;
                console.log({ details: "ConfigureSearchIndex exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    addRedisData(type, VESShortCode, Keyword, ShortCode, Value, Guid) {
        try {
            if (type == "string") {
                redisClient.sadd("SearchIndex:" + VESShortCode + ":" + Keyword + ":" + ShortCode + ":" + Value, Guid);
            } else if (type == "integer" && !(isNaN(Value))) {
                redisClient.zadd("SearchIndex:" + VESShortCode + ":" + Keyword + ":" + ShortCode, Value, Guid);
            } else if (type == "date") {
                var dateValue = new Date(Value);
                dateValue = dateValue.toLocaleString();
                dateValue = dateValue.replace(/[^\w\s]/g, '').replace(/ /g, '').
                    replace(/AM/g, '000');
                if (!(isNaN(dateValue))) {
                    redisClient.zadd("SearchIndex:" + VESShortCode + ":" + Keyword + ":" + ShortCode, dateValue, Guid);
                }
            }
        } catch (err) {
            console.log({ details: "addRedisData exception", error: err });
            console.log(err);
        }
    }

    processMetaData(VESShortCode, Keyword, Guid, searchHash, MetaData, oldMetaData) {
        const self = this;
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
                                                redisClient.srem("SearchIndex:" + VESShortCode + ":" + Keyword + ":" + ShortCode + ":" + OldValue.trim(), Guid);
                                            } else if (type == "integer" || type == "date") {
                                                redisClient.zrem("SearchIndex:" + VESShortCode + ":" + Keyword + ":" + ShortCode, Guid);
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
                        traverse(oldMetaData).forEach((OldValue) => {
                            if (this.key != "undefined" && this.key == ShortCode) {
                                if (type == "string") {
                                    redisClient.srem("SearchIndex:" + VESShortCode + ":" + Keyword + ":" + ShortCode + ":" + OldValue.trim(), Guid);
                                } else if (type == "integer" || type == "date") {
                                    redisClient.zrem("SearchIndex:" + VESShortCode + ":" + Keyword + ":" + ShortCode, Guid);
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

    populateSearchIndex(_VESShortCode, _Guid, _Keyword, _MetaData, Type, callback) {
        try {
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
                console.log({ details: "populateSearchIndex missingMandatoryKeys", error: missingMandatoryKeys });
                return callback("missingMandatoryKeys : " + missingMandatoryKeys);
            }

            if (this.RedisConnected) {
                async.waterfall([
                    (callback) => {
                        redisClient.sismember("Master:" + VESShortCode, Guid, (err, res) => {
                            if (err) {
                                console.log({ details: "populateSearchIndex sismember", error: err });
                                return callback(err);
                            }
                            if (res) {
                                return callback(null);
                            }
                            return callback('Posted Guid not found in TpSchemaSet/' + VESShortCode);
                        });
                    },
                    (callback) => {
                        redisClient.hget("Index:" + VESShortCode, Keyword, (err, res) => {
                            var response = '';
                            if (err) {
                                console.log({ details: "populateSearchIndex hget", error: err });
                                return callback(err);
                            }
                            try {
                                response = (typeof (res) == "string") ? JSON.parse(res) : res;
                            } catch (exp) {
                                console.log({ details: "populateSearchIndex response parse : ", error: exp });
                                return callback(exp);
                            }
                            return callback(null, response);
                        });
                    },
                    (searchHash, callback) => {
                        if (Type && Type == "Refresh") {
                            try {
                                MetaData = (typeof (MetaData) == "string") ? JSON.parse(MetaData) : MetaData;
                            } catch (err) {
                                console.log({ details: "populateSearchIndex parse MetaData", error: err });
                                return callback(err);
                            }
                            if (searchHash) {
                                this.processMetaData(VESShortCode, Keyword, Guid, searchHash, MetaData, null);
                            }
                            return callback(null);
                        } else { //eslint-disable-line
                            var oldMetaData = "";
                            redisClient.hget("Data:" + VESShortCode + ":" + Guid, Keyword, (err, res) => {
                                if (err) {
                                    console.log({ details: "populateSearchIndex hget", error: err });
                                    return callback(err);
                                }
                                redisClient.hset("Data:" + VESShortCode + ":" + Guid, Keyword, MetaData);
                                try {
                                    MetaData = (typeof (MetaData) == "string") ? JSON.parse(MetaData) : MetaData;
                                } catch (exp) {
                                    console.log({ details: "populateSearchIndex parse MetaData", error: exp });
                                    return callback(exp);
                                }
                                if (res) {
                                    try {
                                        oldMetaData = (typeof (res) == "string") ? JSON.parse(res) : res;
                                    } catch (exp) {
                                        console.log({ details: "populateSearchIndex parse oldMetaData", error: exp });
                                        return callback(exp);
                                    }
                                }
                                if (searchHash) {
                                    this.processMetaData(VESShortCode, Keyword, Guid, searchHash, MetaData, oldMetaData);
                                }
                                return callback(null);
                            });
                        }
                    }
                ], (err) => {
                    if (err) {
                        console.log({ details: "populateSearchIndex waterfall", error: err });
                        return callback(err);
                    }
                    return callback(null);
                });
            } else {
                console.log({ details: "populateSearchIndex", error: "Redis connection problem" });
                return callback("Redis connection problem");
            }
        } catch (err) {
            console.log({ details: "populateSearchIndex exception", error: err });
            return callback(err);
        }
    }


    dataInsert(VESShortCode, Guid, Keyword, MetaData, Tag, Comment, Action, retJSON, callback) {
        try {
            this.getHash('Data:' + VESShortCode + ':' + Guid, Keyword, (err, response) => {
                if (err == 'Hash Key not found in Redis') {
                    this.populateSearchIndex(VESShortCode, Guid, Keyword, MetaData, null, (err) => {
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
                    this.snapShotVESData(VESShortCode, Guid, Tag, Comment, Action, (err, res) => {
                        if (err) {
                            retJSON.Status = "false";
                            retJSON.Message = err;
                            return callback(null, retJSON);
                        }
                        this.populateSearchIndex(VESShortCode, Guid, Keyword, MetaData, null, (err) => {
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

    getHash(Hash, Key, callback) {
        try {
            if (this.RedisConnected) {
                redisClient.hget(Hash, Key, (err, res) => {
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

    getResult(SearchListString, SearchLOVString, SearchListScore, SearchLOVScore, callback) {
        try {
            var GuidList = [];
            var hit1 = false;
            var hit2 = false;
            async.parallel([
                (callback) => {
                    if (SearchListString && SearchListString.length > 0) {
                        redisClient.sinter(SearchListString, (err, res) => {
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
                (callback) => {
                    var ScoreResult = [];
                    async.forEachOf(SearchListScore, (ScoreCommand, i, callback) => {
                        var searchScoreCommand = ScoreCommand.split(',');
                        redisClient.zrangebyscore(searchScoreCommand, (err, res) => {
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

                    }, (err) => {
                        if (err) {
                            console.log({ details: "zrangebyscore exception", error: err });
                            return callback(err);
                        }
                        return callback(null, ScoreResult);
                    });
                }
            ], (err, results) => {
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

    getResultLOV(preGuidList, SearchListString, SearchLOVString, SearchListScore, SearchLOVScore, callback) {
        try {
            var GuidList = [];
            var hitfn1 = false;
            var hitfn2 = false;
            async.parallel([
                (callback) => {
                    // var ScoreLOVResult = [];
                    async.forEachOf(SearchLOVString, (command, i, callback) => {
                        var searchCommand = command.split(',');
                        redisClient.sunion(searchCommand, (err, res) => {
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
                    }, (err) => {
                        if (err) {
                            console.log({ details: "sunion exception", error: err });
                            return callback(err);
                        }
                        return callback(null, GuidList);
                    });
                },
                (callback) => {
                    var TotalScoreResult = [];
                    async.forEachOf(SearchLOVScore, (ScoreCommandList, i, callback) => {
                        hitfn2 = true;
                        var ScoreResult = [];
                        async.forEachOf(ScoreCommandList, (ScoreCommand, i, cb) => {
                            var ScoreList = ScoreCommand.split(',');
                            redisClient.zrangebyscore(ScoreList, (err, res) => {
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
                        }, (err) => {
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
                    }, (err) => {
                        if (err) {
                            console.log({ details: "zrangebyscore exception", error: err });
                            return callback(err);
                        }
                        return callback(null, TotalScoreResult);
                    });
                }
            ], (err, results) => {
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

    getSearchData(GuidList, VESShortCode, Keyword, callback) {
        try {
            var items = [];
            async.forEachOf(GuidList, (Guid, i, callback) => {
                var Hash = "Data:" + VESShortCode + ":" + Guid;
                this.getHash(Hash, Keyword, (err, response) => {
                    if (err) {
                        console.log({ details: "getSearchData Error", error: err });
                        return callback(err);
                    }
                    var item = { Guid: Guid, Keyword: Keyword, MetaData: response };
                    items.push(item);
                    return callback(null);
                });

            }, (err) => {
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

    SearchTPHash(VESShortCode, Keyword, payload, resultArray, callback) {
        try {
            var keys = Object.keys(payload);
            var SearchListString = [];
            var SearchListScore = [];
            var SearchLOVString = [];
            var SearchLOVScore = [];
            async.waterfall([
                (callback) => {
                    if (Keyword) {
                        this.getHash("Index:" + VESShortCode, Keyword, callback);
                    } else {
                        return callback('Keyword is missing..');
                    }
                },
                (TpSearchHash, callback) => {
                    var TpSearchHashJson = {};
                    try {
                        TpSearchHashJson = (typeof (TpSearchHash) == "string") ? JSON.parse(TpSearchHash) : TpSearchHash;
                    } catch (err) {
                        console.log({ details: "SearchTPHash", error: err });
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
                                                lovKey += "SearchIndex:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode.trim() + ":" + LOV[j].toString().trim() + ',';
                                            }
                                            lovKey = lovKey.slice(0, -1);
                                            SearchLOVString.push(lovKey);
                                        } else {
                                            Search = "SearchIndex:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode.trim() + ":" + SearchValue.trim();
                                            SearchListString.push(Search);
                                        }
                                    } else if (type == "integer") {
                                        if (SearchValue.indexOf(',') > -1) {
                                            const LOVScore = SearchValue.split(',');
                                            const LOVScoreInternal = [];
                                            for (let j = 0; j < LOVScore.length; j++) {
                                                const lovKeyScore = "SearchIndex:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode + "," + LOVScore[j].trim() + "," + LOVScore[j].trim();
                                                LOVScoreInternal.push(lovKeyScore);
                                            }
                                            SearchLOVScore.push(LOVScoreInternal);
                                        } else {
                                            const Values = SearchValue.split('-');
                                            if (Values.length > 1) {
                                                Search = "SearchIndex:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode + "," + Values[0].trim() + "," + Values[1].trim();
                                            } else {
                                                Search = "SearchIndex:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode + "," + Values[0].trim() + "," + Values[0].trim();
                                            }
                                            SearchListScore.push(Search);
                                        }
                                    } else if (type == "date") {
                                        if (SearchValue.indexOf(',') > -1) {
                                            var LOVScore = SearchValue.split(',');
                                            var LOVScoreInternal = [];
                                            for (var j = 0; j < LOVScore.length; j++) {
                                                var searchDT = this.formatDate(LOVScore[j]);
                                                var lovKeyScore = "SearchIndex:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode + "," + searchDT.trim() + "," + searchDT.trim();
                                                LOVScoreInternal.push(lovKeyScore);
                                            }
                                            SearchLOVScore.push(LOVScoreInternal);
                                        } else {
                                            var Values = SearchValue.split('-');
                                            var fromDate = this.formatDate(Values[0]);
                                            if (Values.length > 1) {
                                                var toDate = this.formatDate(Values[1]);
                                                Search = "SearchIndex:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode + "," + fromDate.trim() + "," + toDate.trim();
                                            } else {
                                                Search = "SearchIndex:" + VESShortCode + ":" + Keyword + ":" + SearchShortCode + "," + fromDate.trim() + "," + fromDate.trim();
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
                this.getResult,
                this.getResultLOV,
                (GuidList, callback) => {
                    this.getSearchData(GuidList, VESShortCode, Keyword, callback);
                }
            ], (err, result) => {
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
            console.log({ details: "SearchTPHash exception", error: err });
            return callback(err);
        }
    }

    SearchDataByProperty(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                var payload = this.getPayloadData(postData);

                if (!payload) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }

                var VESShortCode = payload.VESShortCode;
                var Keyword = payload.Keyword;
                var resultArray = [];

                this.SearchTPHash(VESShortCode, Keyword, payload, resultArray, (err, result) => {
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
                console.log({ details: "SearchDataByProperty exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    getHashAll(Hash, callback) {
        try {
            if (this.RedisConnected) {
                redisClient.hgetall(Hash, (err, res) => {
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

    GetAllSchemaData(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            var items = [];
            try {
                var payload = this.getPayloadData(postData);

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
                    console.log({ details: "GetAllSchemaData missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }

                if (this.RedisConnected) {
                    async.waterfall([
                        (callback) => {
                            if (Guid) {
                                redisClient.sismember("Master:" + VESShortCode, Guid, (err, res) => {
                                    if (err) {
                                        return callback(err);
                                    }
                                    if (res && res == 1) {
                                        return callback(null, [Guid]);
                                    }
                                    return callback('Posted VESShortCode not found in TpSchemaSet');
                                });
                            } else {
                                redisClient.smembers("Master:" + VESShortCode, (err, res) => {
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
                        (GuidList, callback) => {
                            if (Keyword) {
                                async.forEachOf(GuidList, (Guid, i, callback) => {
                                    this.getHash("Data:" + VESShortCode + ":" + Guid, Keyword, (err, res) => {
                                        if (err) {
                                            console.log({ details: "GetAllSchemaData:getHash:Error", error: err });
                                        } else {
                                            var retObj = {};
                                            retObj.Guid = Guid;
                                            retObj.Keyword = Keyword;
                                            retObj.VESData = res;
                                            items.push(retObj);
                                        }
                                        callback(null);
                                    });
                                }, (err) => {
                                    if (err) {
                                        console.log({ details: "GetAllSchemaData exception", error: err });
                                        return callback(err);
                                    }
                                    return callback(null);
                                });
                            } else {
                                async.forEachOf(GuidList, (Guid, i, callback) => {
                                    this.getHashAll("Data:" + VESShortCode + ":" + Guid, (err, res) => {
                                        if (err) {
                                            console.log({ details: "GetAllSchemaData:getHashAll:Error", error: err });
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

                                }, (err) => {
                                    if (err) {
                                        console.log({ details: "GetAllSchemaData exception", error: err });
                                        return callback(err);
                                    }
                                    return callback(null);
                                });
                            }
                        }
                    ], (err) => {
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
                    console.log({ details: "GetAllSchemaData", error: retJSON });
                    return resolve(retJSON);
                }
            } catch (err) {
                retJSON.Status = "false";
                retJSON.Message = err;
                console.log({ details: "GetAllSchemaData exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    snapShotVESData(VESShortCode, Guid, Tag, Comment, Action, callback) {
        try {
            if (this.RedisConnected) {
                async.waterfall([
                    (callback) => {
                        this.getHashAll("Data:" + VESShortCode + ":" + Guid, (err, res) => {
                            if (err) {
                                console.log({ details: "snapShotVESData:getHashAll:Error", error: err });
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
                    (DataHash, callback) => {
                        redisClient.zrevrangebyscore("DataArchive:" + VESShortCode + ":" + Guid, '+inf', '-inf', 'WITHSCORES', 'LIMIT', '0', '1', (err, res) => {
                            if (err) {
                                console.log({ details: "snapShotVESData:zrevrangebyscore:Error", error: err });
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
                    (Version, InDataHash, callback) => {
                        var DataHash = '';
                        DataHash = (typeof (InDataHash) == "string") ? InDataHash : JSON.stringify(InDataHash);
                        redisClient.zadd("DataArchive:" + VESShortCode + ":" + Guid, Version, DataHash);
                        return callback(null, Version);
                    }
                ], (err, result) => {
                    if (err) {
                        console.log({ details: "snapShotVESData:Error", error: err });
                        return callback(err);
                    }
                    return callback(null, result);
                });

            } else {
                console.log({ details: "snapShotVESData ", error: "Redis connection problem" });
                return callback("Redis connection problem");
            }
        } catch (exp) {
            console.log({ details: "snapShotVESData Exception", error: exp });
            return callback(exp);
        }
    }

    CreateBackupData(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                var payload = this.getPayloadData(postData);

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
                    console.log({ details: "CreateBackupData missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }

                this.snapShotVESData(VESShortCode, Guid, Tag, Comment, Action, (err, res) => {
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
                console.log({ details: "CreateBackupData exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    removeDataHash(_VESShortCode, _Guid, _Keyword, _MetaData, callback) {
        try {
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
                console.log({ details: "RemoveData missingMandatoryKeys", error: missingMandatoryKeys });
                return callback("missingMandatoryKeys : " + missingMandatoryKeys);
            }
            if (this.RedisConnected) {
                async.waterfall([
                    (callback) => {
                        this.getHash("Index:" + VESShortCode, Keyword, (err, res) => {
                            if (err) {
                                console.log({ details: "RemoveData TpSearchHash getHash", error: err });
                                return callback(err);
                            }
                            var response = '';
                            try {
                                response = (typeof (res) == "string") ? JSON.parse(res) : res;
                            } catch (exp) {
                                console.log({ details: "RemoveData TpSearchHash response parse : ", error: exp });
                                return callback(exp);
                            }
                            return callback(null, response, MetaData);
                        });
                    },
                    (InSearchHash, InMetaData, callback) => {
                        var MetaData = '', searchHash = '';
                        try {
                            MetaData = (typeof (InMetaData) == "string") ? JSON.parse(InMetaData) : InMetaData;
                            searchHash = (typeof (InSearchHash) == "string") ? JSON.parse(InSearchHash) : InSearchHash;
                        } catch (err) {
                            console.log({ details: "RemoveData MetaData parse : ", error: err });
                            return callback(err);
                        }
                        for (var HashInfo of searchHash) {
                            if (HashInfo && HashInfo.sc) {
                                var ShortCode = HashInfo.sc;
                                var type = HashInfo.type;
                                traverse(MetaData).forEach((Value) => {
                                    if (this.key != "undefined" && this.key == ShortCode) {
                                        if (type == "string") {
                                            redisClient.srem("SearchIndex:" + VESShortCode + ":" + Keyword + ":" + ShortCode + ":" + Value, Guid);
                                        } else if (type == "integer" || type == "date") {
                                            redisClient.zrem("SearchIndex:" + VESShortCode + ":" + Keyword + ":" + ShortCode, Guid);
                                        }
                                        this.stop();
                                    }
                                });
                            }
                        }
                        return callback(null);
                    }
                ], (err) => {
                    if (err) {
                        console.log(err);
                        return callback(null);
                    }
                    return callback(null);
                });

            } else {
                console.log({ details: "RemoveData ", error: "Redis connection problem" });
                return callback("Redis connection problem");
            }
        } catch (err) {
            console.log({ details: "RemoveData exception", error: err });
            return callback(err);
        }
    }

    RemoveData(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                var payload = this.getPayloadData(postData);

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
                    console.log({ details: "RemoveData missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }
                if (this.RedisConnected) {
                    async.waterfall([
                        (callback) => {
                            this.snapShotVESData(VESShortCode, Guid, Tag, Comment, Action, callback);
                        },
                        (Version, callback) => {
                            this.getHash("Data:" + VESShortCode + ":" + Guid, Keyword, (err, res) => {
                                if (err) {
                                    console.log({ details: "RemoveData:getHash:Error", error: err });
                                    return callback(err);
                                } else if (res) {
                                    redisClient.hdel("Data:" + VESShortCode + ":" + Guid, Keyword);
                                    return callback(null, res);
                                }
                                return callback('Hash key not found in Redis');
                            });
                        },
                        (MetaData, callback) => {
                            this.removeDataHash(VESShortCode, Guid, Keyword, MetaData, callback);
                        }
                    ], (err) => {
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
                    console.log({ details: "RemoveData ", error: "Redis connection problem" });
                    return resolve(retJSON);
                }
            } catch (err) {
                retJSON.Status = "false";
                retJSON.Message = err;
                console.log({ details: "RemoveData exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    checkTPData(VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, self, callback) {
        try {
            if (self.RedisConnected) {
                redisClient.hgetall("Data:" + VESShortCode + ":" + Guid, (err, res) => {
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

    snapShotData(VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, self, callback) {
        try {
            async.waterfall([
                (callback) => {
                    self.snapShotVESData(VESShortCode, Guid, Tag, Comment, Action, callback);
                },
                (Version, callback) => {
                    self.getHashAll("Data:" + VESShortCode + ":" + Guid, (err, res) => {
                        if (err) {
                            console.log({ details: "RestoreData, snapShotData:getHashAll:Error", error: err });
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
                (DataItems, callback) => {
                    async.forEachOf(DataItems, (item, i, callback) => {
                        self.removeDataHash(item.VESShortCode, item.Guid, item.Keyword, item.MetaData, (err) => {
                            if (err) {
                                console.log({ details: "RestoreData, snapShotData:RemoveData:Error", error: err });
                            }
                            callback(null);
                        });
                    }, (err) => {
                        if (err) {
                            console.log({ details: "RestoreData, snapShotTPData forEachOf Error", error: err });
                            return callback(err);
                        }
                        redisClient.del("Data:" + VESShortCode + ":" + Guid);
                        return callback(null);
                    });
                }
            ], (err) => {
                if (err) {
                    console.log({ details: "RestoreData, snapShotTPData Error", error: err });
                    return callback(err);
                }
                return callback(null, VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, self);
            });
        } catch (error) {
            console.log({ details: "RestoreData,snapShotTPData Exception", error: error });
            return callback(error);
        }
    }

    rollbackData(VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, self, callback) {
        try {
            async.waterfall([
                (callback) => {
                    redisClient.zrangebyscore("DataArchive:" + VESShortCode + ":" + Guid, RollbackVersion, RollbackVersion, (err, res) => {
                        if (err) {
                            console.log({ details: "RestoreData zrangebyscore Error", error: err });
                            return callback(err);
                        } else if (res) {
                            var response = '';
                            try {
                                response = (typeof (res[0]) == "string") ? JSON.parse(res[0]) : res[0];
                            } catch (exp) {
                                console.log({ details: "RestoreData res parse : ", error: exp });
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
                (DataItems, callback) => {
                    async.forEachOf(DataItems, (item, i, callback) => {
                        self.populateSearchIndex(item.VESShortCode, item.Guid, item.Keyword, item.MetaData, null, (err) => {
                            if (err) {
                                console.log({ details: "RestoreData forEachOf Error", error: err });
                            }
                            return callback(null);
                        });
                    }, (err) => {
                        if (err) {
                            console.log({ details: "RestoreData forEachOf Error", error: err });
                            return callback(err);
                        }
                        return callback(null);
                    });
                }
            ], (err) => {
                if (err) {
                    console.log({ details: "RestoreData forEachOf Error", error: err });
                    return callback(err);
                }
                return callback(null);
            });
        } catch (error) {
            console.log({ details: "RestoreData forEachOf Error", error: error });
            return callback(error);
        }
    }

    RestoreData(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                var payload = this.getPayloadData(postData);

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
                    console.log({ details: "RestoreData missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }
                if (this.RedisConnected) {
                    async.waterfall([
                        async.constant(VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, this),
                        conditional.if(this.checkTPData, this.snapShotData),
                        (VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, asyncself, callback) => {
                            this.rollbackData(VESShortCode, Guid, Tag, Comment, Action, RollbackVersion, asyncself, callback);
                        }
                    ], (err) => {
                        if (err) {
                            console.log({ details: "RestoreData Error", error: err });
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
                    console.log({ details: "RestoreData ", error: "Redis connection problem" });
                    return resolve(retJSON);
                }
            } catch (err) {
                retJSON.Status = "false";
                retJSON.Message = err;
                console.log({ details: "RestoreData exception", error: err });
                return resolve(retJSON);
            }
        });
    }

    ListSearchIndex(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                var payload = this.getPayloadData(postData);

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
                    console.log({ details: "ListSearchIndex missingMandatoryKeys", error: missingMandatoryKeys });
                    return reject(retJSON);
                }

                this.getHash("Index:" + VESShortCode, Keyword, (err, res) => {
                    if (err) {
                        retJSON.Status = "false";
                        retJSON.Message = err;
                        console.log("Error:ListSearchIndex", err);
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
                console.log("Exception:ListSearchIndex", error);
                return resolve(retJSON);
            }
        });
    }

    RefreshSchemaSearchIndex(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                var payload = this.getPayloadData(postData);

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
                    console.log({ details: "RefreshSchemaSearchIndex missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }
                if (this.RedisConnected) {
                    async.waterfall([
                        (callback) => {
                            redisClient.smembers("Master:" + VESShortCode, (err, res) => {
                                if (err) {
                                    console.log({ details: "RefreshSchemaSearchIndex:getHashAll:Error", error: err });
                                    return callback(err);
                                } else if (res) {
                                    return callback(null, res);
                                }
                                return callback('Hash Key not found in Redis');
                            });
                        },
                        (ScemaItems, callback) => {
                            async.forEachOfSeries(ScemaItems, (Guid, key, callbackeach) => {
                                this.getHashAll("Data:" + VESShortCode + ":" + Guid, (err, res) => {
                                    if (err) {
                                        console.log({ details: "RefreshSchemaSearchIndex:getHashAll:Error", error: err });
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
                                        async.forEachOf(items, (item, i, callbackOf) => {
                                            this.populateSearchIndex(item.VESShortCode, item.Guid, item.Keyword, item.MetaData, 'Refresh', (err) => {
                                                if (err) {
                                                    console.log({ details: "RefreshSchemaSearchIndex:populateSearchIndex:Error", error: err });
                                                    return callbackOf(err);
                                                }
                                                callbackOf(null);
                                            });
                                        }, (err) => {
                                            if (err) {
                                                console.log({ details: "RefreshSchemaSearchIndex forEachOf exception", error: err });
                                                return callbackeach(err);
                                            }
                                            return callbackeach(null);
                                        });
                                    } else {
                                        return callbackeach(null);
                                    }
                                });
                            }, (err) => {
                                if (err) {
                                    console.log({ details: "RefreshSchemaSearchIndex:getHashAll:Error", error: err });
                                    return callback(err);
                                }
                                return callback(null);
                            });
                        }
                    ], (err) => {
                        if (err) {
                            console.log({ details: "RefreshSchemaSearchIndex waterfall", error: err });
                            retJSON.Status = "false";
                            retJSON.Message = err;
                        } else {
                            retJSON.Status = "true";
                            retJSON.Message = "Success";
                        }
                        return resolve(retJSON);
                    });
                } else {
                    console.log({ details: "RefreshSchemaSearchIndex", error: "Redis connection problem" });
                    retJSON.Status = "false";
                    retJSON.Message = "Redis connection problem";
                    return resolve(retJSON);
                }
            } catch (err) {
                console.log({ details: "RefreshSchemaSearchIndex exception", error: err });
                retJSON.Status = "false";
                retJSON.Message = err;
                return resolve(retJSON);
            }
        });
    }

    InsertData(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                var payload = this.getPayloadData(postData);

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
                        console.log({ details: "InsertData atob certificate exception", error: err });
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
                    console.log({ details: "InsertData missingMandatoryKeys", error: missingMandatoryKeys });
                    return resolve(retJSON);
                }

                async.waterfall([
                    (callback) => {
                        this.CreateTPGUID(VESShortCode, Guid, callback);
                    },
                    (insertId, callback) => {
                        this.dataInsert(VESShortCode, insertId, Keyword, MetaData, Tag, Comment, Action, retJSON, callback);
                    }
                ], (err, result) => {
                    if (err) {
                        console.log(err);
                        return reject(err);
                    }
                    // console.log(result);
                    return resolve(result);
                });
            } catch (error) {
                console.log(error);
                retJSON.Status = "false";
                retJSON.Message = error;
                console.log({ details: "InsertData exception", error: error });
                return resolve(retJSON);
            }
        });
    }

    getAllSchemaData(VESShortCode, Guid, Keyword, items, callback) {
        // var retJSON = {};
        async.waterfall([
            (callback) => {
                if (Guid) {
                    redisClient.sismember("Master:" + VESShortCode, Guid, (err, res) => {
                        if (err) {
                            return callback(err);
                        }
                        if (res && res == 1) {
                            return callback(null, [Guid]);
                        }
                        return callback('Posted VESShortCode not found in TpSchemaSet');
                    });
                } else {
                    redisClient.smembers("Master:" + VESShortCode, (err, res) => {
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
            (GuidList, callback) => {
                if (Keyword) {
                    async.forEachOf(GuidList, (Guid, i, callback) => {
                        this.getHash("Data:" + VESShortCode + ":" + Guid, Keyword, (err, res) => {
                            if (err) {
                                console.log({ details: "GetAllSchemaData:getHash:Error", error: err });
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
                    }, (err) => {
                        if (err) {
                            console.log({ details: "GetAllSchemaData exception", error: err });
                            return callback(err);
                        }
                        return callback(null);
                    });
                } else {
                    async.forEachOf(GuidList, (Guid, i, callback) => {
                        this.getHashAll("Data:" + VESShortCode + ":" + Guid, (err, res) => {
                            if (err) {
                                console.log({ details: "GetAllSchemaData:getHashAll:Error", error: err });
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

                    }, (err) => {
                        if (err) {
                            console.log({ details: "GetAllSchemaData exception", error: err });
                            return callback(err);
                        }
                        return callback(null);
                    });
                }
            }
        ], (err) => {
            if (err) {
                return callback(null, err);
            }
            return callback(null);
        });
    }

    SearchMultipleData(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                var payload = this.getPayloadData(postData);
                if (!payload) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }
                const Schema = Array.isArray(payload.Schema) ? payload.Schema : [payload.Schema];
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
                    async.forEachOfSeries(Schema, (Shortcode, key, callbackeach) => {
                        this.SearchTPHash(Shortcode, Keyword, newPayload, resultArray, callbackeach);
                    }, (err) => {
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
                    async.forEachOfSeries(Schema, (Shortcode, key, callbackeach) => {
                        this.getAllSchemaData(Shortcode, Guid, Keyword, resultArray, callbackeach);
                    }, (err) => {
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

    Search(postData) {
        return new Promise((resolve, reject) => {
            var retJSON = {};
            try {
                var payload = this.getPayloadData(postData);
                if (!payload) {
                    return reject({ Status: false, Message: 'Invalid Postdata' });
                }
                const Schema = Array.isArray(payload.Schema) ? payload.Schema : [payload.Schema];
                const Keyword = payload.Keyword ? payload.Keyword : 'Label';
                const Guid = payload.Guid ? payload.Guid : null;
                var resultArray = [];
                if (Guid === null) {
                    async.forEachOfSeries(Schema, (Shortcode, key, callbackeach) => {
                        this.SearchTPHash(Shortcode, Keyword, payload, resultArray, callbackeach);
                    }, (err) => {
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
                    async.forEachOfSeries(Schema, (Shortcode, key, callbackeach) => {
                        this.getAllSchemaData(Shortcode, Guid, Keyword, resultArray, callbackeach);
                    }, (err) => {
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
                }

            } catch (error) {
                retJSON.Status = "false";
                retJSON.Message = error;
                console.log(retJSON);
                return resolve(retJSON);
            }
        });
    }

    createConnection(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use CreateConnection(), createConnection() is depricated');
            this.CreateConnection(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    closeConnection(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use CloseConnection(), closeConnection() is depricated');
            this.CloseConnection(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    showStatus(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use ShowConnectionStatus(), showStatus() is depricated');
            this.ShowConnectionStatus(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    sSetupSearchHash(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use ConfigureSearchIndex(), sSetupSearchHash() is depricated');
            this.ConfigureSearchIndex(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    InsertTidalPoolSchema(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use CreateSchema(), InsertTidalPoolSchema() is depricated');
            this.CreateSchema(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    InsertTPData(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use InsertData(), InsertTPData() is depricated');
            this.InsertData(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    /** Directly called to main function no need to Depricate InsertData function name * /
    InsertData(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use InsertData(), InsertData() is depricated');
            this.InsertData(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    /** */
    GetTidalPoolSchema(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use GetAllSchemaData(), GetTidalPoolSchema() is depricated');
            this.GetAllSchemaData(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    SearchTidalPoolHash(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use SearchDataByProperty(), SearchTidalPoolHash() is depricated');
            this.SearchDataByProperty(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    GetDatafromSchemas(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use SearchMultipleData(), GetDatafromSchemas() is depricated');
            this.SearchMultipleData(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    GetSchemaList(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use ListSchemas(), GetSchemaList() is depricated');
            this.ListSchemas(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    GetSearchHashSchema(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use ListSearchIndex(), GetSearchHashSchema() is depricated');
            this.ListSearchIndex(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    GetTpSearchHash(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use ListSearchIndex(), GetTpSearchHash() is depricated');
            this.ListSearchIndex(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    SetKeyData(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use SetCacheData(), SetKeyData() is depricated');
            this.SetCacheData(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    GetKeyData(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use GetCacheData(), GetKeyData() is depricated');
            this.GetCacheData(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    RefreshTidalPoolData(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use RefreshSchemaSearchIndex(), RefreshTidalPoolData() is depricated');
            this.RefreshSchemaSearchIndex(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    UpdateTidalPoolHash(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use RefreshSchemaSearchIndex(), UpdateTidalPoolHash() is depricated');
            this.RefreshSchemaSearchIndex(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    SnapshotTidalPoolData(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use CreateBackupData(), SnapshotTidalPoolData() is depricated');
            this.CreateBackupData(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    RemoveTidalPoolData(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use RemoveData(), RemoveTidalPoolData() is depricated');
            this.RemoveData(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }
    RollbackTidalPoolData(Payload) {
        return new Promise((resolve, reject) => {
            console.error('use RestoreData(), RollbackTidalPoolData() is depricated');
            this.RestoreData(Payload).
                then((result) => resolve(result)).
                catch((err) => reject(err));
        });
    }

};
