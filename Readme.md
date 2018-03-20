# **Redis Data Lake**

## Use Redis as a document database with extensive search capabilities

## **Installation**

### USING NPM

```sh
$ npm install datalake --save
```

### In node.js

```js
const datalake = require('datalake');
const dl = new datalake();
```

**Implementation**

Code:

```js
const dl = require('datalake');
const datalake = new datalake();

datalake.MethodName(InputParamater).
    then((response) => {
        // do your logics here
    }).
    catch((err) => {
        console.log(err);
    });
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## Available Methods

| S.No | API Name | Method | Required Fields | Optional Fields | Sample PostData | Notes |
| ---- | -------- | ------ | --------------- | --------------- | --------------- | ----- |
| 2 | [/CloseConnection](#closeconnection) | GET | ------------ | ------------ | ------------ | ------------ |
| 2 | [/ConfigureSearchIndex](#configuresearchindex) | POST | ShortCodes(sc, type, csv), Schema, Keyword | ------------ |[/ConfigureSearchIndex](#configuresearchindex) | ------------ |
| 2 | [/CreateBackupData](#createbackupdata) | POST | Schema, Guid | ------------ | [/CreateBackupData](#createbackupdata) | ------------ |
| 2 | [/CreateConnection](#createconnection) | POST | host,dbname | port,password,maxConnection | [/CreateConnection](#createconnection) | ------------ |
| 2 | [/Fetch](#fetch) | POST | 
| 2 | [/GetAllSchemaData](#getallschemadata) | POST | Schema| Keyword, Guid | [/GetAllSchemaData](#getallschemadata) | This API cannot used in big data (_Server will crash_) |
| 2 | [/GetCacheData](#getcachedata) | POST | Schema,Key | ------------ | [/GetCacheData](#getcachedata) | ------------ |
| 2 | [/getDistinctRecords](#getDistinctRecords) | POST |
| 2 | [/InsertData](#insertdata) | POST | Schema, Keyword, MetaData | ------------ | [/InsertData](#insertdata) | ------------ |
| 2 | [/ListSchemas](#listschemas) | GET | ------------ | ------------ | ------------ | ------------ |
| 2 | [/ListSearchIndex](#listsearchindex) | POST | Schema, Keyword | ------------ | [/ListSearchIndex](#listsearchindex) | ------------ |
| 2 | [/RefreshSchemaSearchIndex](#refreshschemasearchindex) | POST | Schema | Guid | [/RefreshSchemaSearchIndex](#refreshschemasearchindex) | ------------ |
| 2 | [/RemoveData](#removedata) | POST |
| 2 | [/RestoreData](#restoredata) | POST | Schema, Guid, Version | ------------ | [/RestoreData](#restoredata) | ------------ |
| 2 | [/Search](#search) | POST | Schema, Keyword | (SearchFields), recordFrom, recordUpto, Guid | [/Search](#search) | Schema, (SearchFields) can be single value or can be comma (,) seperated or can be ranged (~). Either (SearchFields) or Guid should be given else This API cannot used in big data (_Server will crash_)|
| 2 | [/SearchDataByProperty](#searchdatabyproperty) | POST | Schema, Keyword, (SearchFields) | ------------ | [/SearchMultipleData](#searchmultipledata) | (SearchFields) can be single value or can be comma (,) seperated or can be ranged (~) |
| 2 | [/SearchMultipleData](#searchmultipledata)  | POST | Schema, Keyword | PropertyField, PropertyValue, Guid | [/SearchDataByProperty](#searchdatabyproperty) | Schema, PropertyField, PropertyValue can be single value or can be comma (,) seperated or can be ranged (~). Either (SearchFields) or Guid should be given else This API cannot used in big data (_Server will crash_) |
| 2 | [/SearchTopRecords](#SearchTopRecords) | POST | Schema, Keyword, Nextbatch, BATCHCOUNT, field | ------- | [/SearchTopRecords](#SearchTopRecords) | Nextbatch will be first element of response data |
| 2 | [/SetCacheData](#setcachedata) | POST | Schema, Key, Data | Timeout | [/SetCacheData](#setcachedata) | If Timeout is not given, Data will be stored in redis permanently |
| 2 | [/ShowConnectionStatus](#showconnectionstatus) | GET | ------------ | ------------ | ------------ | ------------ |
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## Sample Input

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **createConnection**

`POST` : createConnection() → {undefined}

> This will Create Redis Connection pool object.

Post Data:

```json
{
    "host": "localhost",
    "dbname": "0",
    "port": "1607", // Optional
    "password": "YourPassword" // Optional
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **closeConnection**

`GET` : closeConnection() → {undefined}

> This will close already created Redis connection pool if any.

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **showStatus**

`GET` : showStatus() → {JSON}

> Returns the Status of Redis connection

Response:

```json
{
  "Status": "TP Redis Module Loaded and Ready to Rock and Roll...",
  "Message": "DataLake - Licensed by SkunkworxLab, LLC."
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **SetupSearchHash**

`POST` : SetupSearchHash() → {JSON}

> Defining Redis Schema index keys

Post Data:

```json
{
    "ShortCodes": [
        {
            "sc": "Name",
            "type": "string"
        },
        {
            "sc": "Email",
            "type": "string"
        },
        {
            "sc": "Phone",
            "type": "integer"
        },
        {
            "sc": "Joined",
            "type": "date"
        },
        {
            "sc": "WorkLocation",
            "type": "string",
            "csv": "true"
        }
    ],
    "Schema": "company",
    "Keyword": "employee"
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **InsertData**

`POST` : InsertData() → {JSON}

> This will insert Key value pair against the Schema given

Post Data:

```json
{
    "Guid": "ced293b4-23d8-490f-8944-9495bad5b003", // optional
    "Schema": "company",
    "Keyword": "employee",
    "MetaData": "{ \"Name\": \"Aswin\",  \"Email\": \"aswin5010@gmail.com\", \"Age\": \"25\", \"Phone\": \"9876543210\", \"Joined\": \"06-March-2016\", \"WorkLocation\": [\"California\", \"India\"] }" // MetaData will be stringified json object.
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **GetAllSchemaData**

`POST` : GetAllSchemaData() → {JSON}

> This will search records for given Keyword, Schema and returns all Key-value pair available in the schema. Result can be filtered with particular Guid

Post Data:

```json
{
    "Guid": "ced293b4-23d8-490f-8944-9495bad5b003", // optional
    "Schema": "companies",
    "Keyword": "employee"
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **SearchTidalPoolHash**

`POST` : SearchTidalPoolHash() → {JSON}

> This will search record for given PropertyField, PropertyValue, Keyword and SchemaName including comma(,) separated PropertyValues and range of PropertyValue

**Implementation**

Post Data:

```json
{
    "Schema":"companies",
    "Keyword": "employee",
    "Name": "Aswin",
    "Email": "aswin5010@gmail.com",
    "Joined": "6-March-2018"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.SearchTidalPoolHash(postData).
    then((response) => {
        // do your logics here
        console.log(response);
    }).
    catch((err) => {
        console.log(err);
    });
```

Response:

```json
{
  "Status": "true",
  "Message": "Success",
  "TotalCount": 1,
  "items": [
    {
      "Guid": "ced293b4-23d8-490f-8944-9495bad5b003",
      "Keyword": "Label",
      "MetaData": "{ \"FirstName\": \"Aswin\",  \"City\": \"New York\", \"Age\": \"25\" }"
    }
  ]
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **GetDatafromSchemas**

`POST` : GetDatafromSchemas() → {JSON}

> This Method is the combination of GetSearchHashSchema, GetTidalPoolSchema, and SearchTidalPoolHash. This will search the records for given PropertyField, PropertyValue, Keyword and SchemaName. Multi-value search of records using comma(,) separated list of PropertyValue(s) or range between the PropertyValue(s) or it can be filtered with particular Guid. **It can also performs multiple comma(,) separated Schema Name search**.

**Implementation**

Post Data:

```json
{
    "Schema": "Test",
    "PropertyField": ["FirstName"],
    "PropertyValue": ["Aswin"]
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.GetDatafromSchemas(postData).
    then((response) => {
        // do your logics here
        console.log(response);
    }).
    catch((err) => {
        console.log(err);
    });
```

Response:

```json
{
    "Status": "true",
    "Message": "Success",
    "items": {
        "Test": [
            {
                "Guid": "ced293b4-23d8-490f-8944-9495bad5b003",
                "Keyword": "Label",
                "MetaData": "{ \"FirstName\": \"Aswin\",  \"City\": \"New York\", \"Age\": \"25\" }"
            }
        ]
    }
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **GetSchemaList**

`GET` : GetSchemaList() → {undefined}

> GetSchemaList will return list of Schema Names available in the Selected Redis DB.

**Implementation**

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.GetSchemaList(postData).
    then((response) => {
        // do your logics here
        console.log(response);
    }).
    catch((err) => {
        console.log(err);
    });
```

Response:

```json
{
    "Status": "true",
    "Message": "Success",
    "items": [
        "Test"
    ]
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **GetSearchHashSchema**

`POST` : GetSearchHashSchema() → {JSON}

> This will return the defined Redis Schema index keys for the given Schema Name.

**Implementation**

Post Data:

```json
{
    "VESShortCode": "Test",
    "Keyword": "Label"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.GetSearchHashSchema(postData).
    then((response) => {
        // do your logics here
        console.log(response);
    }).
    catch((err) => {
        console.log(err);
    });
```

Response:

```json
{
  "Status": "true",
  "VESShortCode": "Test",
  "Keyword": "Label",
  "SearchHash": [
    {
      "sc": "FirstName",
      "type": "string"
    },
    {
      "sc": "City",
      "type": "string"
    },
    {
      "sc": "Age",
      "type": "integer"
    }
  ]
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **GetTpSearchHash**

`POST` : GetTpSearchHash() → {JSON}

> This will return the defined Redis Schema index keys for the given Schema Name.

**Implementation**

Post Data:

```json
{
    "Keyword": "Label",
    "VESShortCode": "Test"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.GetTpSearchHash(postData).
    then((response) => {
        // do your logics here
        console.log(response);
    }).
    catch((err) => {
        console.log(err);
    });
```

Response:

```json
{
  "Status": "true",
  "Message": "Success",
  "items": [
    {
      "sc": "FirstName",
      "type": "string"
    },
    {
      "sc": "City",
      "type": "string"
    },
    {
      "sc": "Age",
      "type": "integer"
    }
  ]
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **SetKeyData**

`POST` : SetKeyData() → {JSON}

> Set cache data into the Redis DB for the given key-value pair with TTL(Time to live) provided. _If TTL(Time to live) not provided, it will set cache data as permanent data._

**Implementation**

Post Data:

```json
{
    "Schema": "doshArnCache:12345",
    "Key": "Data",
    "Data": "{ \"FirstName\": \"Aswin\",  \"City\": \"New York\", \"Age\": \"25\" }",
    "TimeOut": 100
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.SetKeyData(postData).
    then((response) => {
        // do your logics here
        console.log(response);
    }).
    catch((err) => {
        console.log(err);
    });
```

Response:

```json
{
  "Status": "true",
  "Message": "Success"
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **GetKeyData**

`POST` : GetKeyData() → {JSON}

> Get the value from cache memory for given search key before the TTL(Time to live) expire

**Implementation**

Post Data:

```json
{
    "Schema": "doshArnCache:12345",
    "Key": "Data"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.GetKeyData(postData).
    then((response) => {
        // do your logics here
        console.log(response);
    }).
    catch((err) => {
        console.log(err);
    });
```

Response:

```json
{
    "Status": "true",
    "Data": [
        "{ \"FirstName\": \"Aswin\",  \"City\": \"New York\", \"Age\": \"25\" }"
    ]
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **RefreshTidalPoolData**

`POST` : RefreshTidalPoolData() → {JSON}

> Refresh/Re-Build all the search index for the given Schema Name

**Implementation**

Post Data:

```json
{
    "VESShortCode": "Test"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.RefreshTidalPoolData(postData).
    then((response) => {
        // do your logics here
        console.log(response);
    }).
    catch((err) => {
        console.log(err);
    });
```

Response:

```json
{
    "Status": "true",
    "Message": "Success"
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **UpdateTidalPoolHash**

`POST` : UpdateTidalPoolHash() → {JSON}

> Refresh/Re-Build particular search index for the given Guid, Schema Name.

**Implementation**

Post Data:

```json
{
    "VESShortCode": "Test",
    "Guid": "ced293b4-23d8-490f-8944-9495bad5b003"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.UpdateTidalPoolHash(postData).
    then((response) => {
        // do your logics here
        console.log(response);
    }).
    catch((err) => {
        console.log(err);
    });
```

Response:

```json
{
  "Status": "true",
  "Message": "Success"
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **SnapshotTidalPoolData**

`POST` : SnapshotTidalPoolData() → {JSON}

> It Creates Backup copy of given Guid, Schema Name.

**Implementation**

Post Data:

```json
{
    "VESShortCode": "Test",
    "Guid": "ced293b4-23d8-490f-8944-9495bad5b003"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.SnapshotTidalPoolData(postData).
    then((response) => {
        // do your logics here
        console.log(response);
    }).
    catch((err) => {
        console.log(err);
    });
```

Response:

```json
{
    "Status": "true",
    "Message": "Success",
    "Version": "1"
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **RemoveTidalPoolData**

`POST` : RemoveTidalPoolData() → {JSON}

> It Creates Backup copy of given Guid, Schema Name and Removes Key-value pair from the Schema.

**Implementation**

Post Data:

```json
{
    "Keyword": "Label",
    "VESShortCode": "Test",
    "Guid": "ced293b4-23d8-490f-8944-9495bad5b003"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.RemoveTidalPoolData(postData).
    then((response) => {
        // do your logics here
        console.log(response);
    }).
    catch((err) => {
        console.log(err);
    });
```

Response:

```json
{
  "Status": "true",
  "Message": "Success"
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### **RollbackTidalPoolData**

`POST` : RollbackTidalPoolData() → {JSON}

> It Creates Backup copy of current Key-Value pair for the Given Guid-Schema and Replaces old Key-Value pair from Archive.

**Implementation**

Post Data:

```json
{
    "Version": "1",
    "VESShortCode": "Test",
    "Guid": "ced293b4-23d8-490f-8944-9495bad5b003"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.RollbackTidalPoolData(postData).
    then((response) => {
        // do your logics here
        console.log(response);
    }).
    catch((err) => {
        console.log(err);
    });
```

Response:

```json
{
  "Status": "true",
  "Message": "Success"
}
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
