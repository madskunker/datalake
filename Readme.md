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

## Available Methods

| S.No | Method Name | Description |
| ---- | ----------- | ----------- |
| 1  | [createConnection](#createconnection) | This will Create Redis Connection pool object. |
| 2  | [closeConnection](#closeconnection) | This will close already created Redis connection pool if any. |
| 3  | [showStatus](#showstatus) | Returns the Status of Redis connection |
| 4  | [SetupSearchHash](#setupsearchhash) | Defining Redis Schema index keys |
| 5  | [InsertTidalPoolSchema](#inserttidalpoolschema) | This will Create new Schema |
| 6  | [InsertTPData](#inserttpdata) | This will insert Key value pair against the Schema given |
| 7  | [InsertData](#insertdata) | This will insert Key value pair against the Schema given, if Schema is not found, automatically will create new Schema and insert the key value pair against the newly created schema |
| 8  | [GetTidalPoolSchema](#gettidalpoolschema) | This will search records for given Keyword, Schema and returns all Key-value pair available in the schema. Result can be filtered with particular Guid |
| 9  | [SearchTidalPoolHash](#searchtidalpoolhash) | This will search record for given PropertyField, PropertyValue, Keyword and SchemaName including comma(,) separated PropertyValues and range of PropertyValue |
| 10 | [GetDatafromSchemas](#getdatafromschemas) | This Method is the combination of GetSearchHashSchema, GetTidalPoolSchema, and SearchTidalPoolHash. This will search the records for given PropertyField, PropertyValue, Keyword and SchemaName. Multi-value search of records using comma(,) separated list of PropertyValue(s) or range between the PropertyValue(s) or it can be filtered with particular Guid. **It can also performs multiple comma(,) separated Schema Name search**. |
| 11 | [GetSchemaList](#getschemalist) | GetSchemaList will return list of Schema Names available in the Selected Redis DB. |
| 12 | [GetSearchHashSchema](#getsearchhashschema) | This will return the defined Redis Schema index keys for the given Schema Name. |
| 13 | [GetTpSearchHash](#gettpsearchhash) | This will return the defined Redis Schema index keys for the given Schema Name. |
| 14 | [SetKeyData](#setkeydata) | Set cache data into the Redis DB for the given key-value pair with TTL(Time to live) provided. _If TTL(Time to live) not provided, it will set cache data as permanent data._ |
| 15 | [GetKeyData](#getkeydata) | Get the value from cache memory for given search key before the TTL(Time to live) expires|
| 16 | [RefreshTidalPoolData](#refreshtidalpooldata) | Refresh/Re-Build all the search index for the given Schema Name |
| 17 | [UpdateTidalPoolHash](#updatetidalpoolhash) | Refresh/Re-Build particular search index for the given Guid, Schema Name. |
| 18 | [SnapshotTidalPoolData](#snapshottidalpooldata) | It Creates Backup copy of given Guid, Schema Name. |
| 19 | [RemoveTidalPoolData](#removetidalpooldata) | It Creates Backup copy of given Guid, Schema Name and Removes Key-value pair from the Schema. |
| 20 | [RollbackTidalPoolData](#rollbacktidalpooldata) | It Creates Backup copy of current Key-Value pair for the Given Guid-Schema and Replaces old Key-Value pair from Archive. |

_**v1.3.2 is and lower versions are deprecated** Function Names are Renamed Please Read below Table for new function name_

| S.No | Method Name | Renamed To |
| ---- | ----------- | ---------- |
| 1| [createConnection](#createconnection) | CreateConnection |
| 2| [closeConnection](#closeconnection) | CloseConnection |
| 3| [showStatus](#showstatus) | ShowConnectionStatus |
| 4| [SetupSearchHash](#setupsearchhash) | ConfigureSearchIndex |
| 5| [InsertTidalPoolSchema](#inserttidalpoolschema) | CreateSchema |
| 6| [InsertTPData](#inserttpdata) | InsertData |
| 7| [InsertData](#insertdata) | InsertData |
| 8| [GetTidalPoolSchema](#gettidalpoolschema) | GetAllSchemaData |
| 9| [SearchTidalPoolHash](#searchtidalpoolhash) | SearchDataByProperty |
| 10| [GetDatafromSchemas](#getdatafromschemas) | SearchMultipleData |
| 11| [GetSchemaList](#getschemalist) | ListSchemas |
| 12| [GetSearchHashSchema](#getsearchhashschema) | ListSearchIndex |
| 13| [GetTpSearchHash](#gettpsearchhash) | ListSearchIndex |
| 14| [SetKeyData](#setkeydata) | SetCacheData |
| 15| [GetKeyData](#getkeydata) | GetCacheData |
| 16| [RefreshTidalPoolData](#refreshtidalpooldata) | RefreshSchemaSearchIndex |
| 17| [UpdateTidalPoolHash](#updatetidalpoolhash) | RefreshSchemaSearchIndex |
| 18| [SnapshotTidalPoolData](#snapshottidalpooldata) | CreateBackupData |
| 19| [RemoveTidalPoolData](#removetidalpooldata) | RemoveData |
| 20| [RollbackTidalPoolData](#rollbacktidalpooldata) | RestoreData |

## Methods

-----------------------------------------

### **createConnection**

`POST` : createConnection() → {undefined}

> This will Create Redis Connection pool object.

**Implementation**

Post Data:

```json
{
    "host": "localhost",
    "dbname": "0"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.createConnection(postData).
    then((response) => {
        // do your logics here
        // console.log('redis Connected');
        // console.log('Redis db 0 selected');
    }).
    catch((err) => {
        console.log(err);
    });
```

-----------------------------------------

### **closeConnection**

`GET` : closeConnection() → {undefined}

> This will close already created Redis connection pool if any.

**Implementation**

Code:

```js
const datalake = require('datalake');
const dl = new datalake();

dl.closeConnection();
console.log('Connection closed');
```

-----------------------------------------

### **showStatus**

`GET` : showStatus() → {JSON}

> Returns the Status of Redis connection

**Implementation**

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.showStatus(postData).
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
  "Status": "TP Redis Module Loaded and Ready to Rock and Roll...",
  "Message": "DataLake - Licensed by SkunkworxLab, LLC."
}
```

-----------------------------------------

### **SetupSearchHash**

`POST` : SetupSearchHash() → {JSON}

> Defining Redis Schema index keys

**Implementation**

Post Data:

```json
{
    "ShortCodes": [
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

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.SetupSearchHash(postData).
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

-----------------------------------------

### **InsertTidalPoolSchema**

`POST` : InsertTidalPoolSchema() → {JSON}

> This will Create new Schema

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
dl.InsertTidalPoolSchema(postData).
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
  "insertId": "ced293b4-23d8-490f-8944-9495bad5b003"
}
```

-----------------------------------------

### **InsertTPData**

`POST` : InsertTPData() → {JSON}

> This will insert Key value pair against the Schema given

**Implementation**

Post Data:

```json
{
  "Guid": "ced293b4-23d8-490f-8944-9495bad5b003",
  "VESShortCode": "Test",
  "Keyword": "Label",
  "MetaData": "{ \"FirstName\": \"Aswin\",  \"City\": \"New York\", \"Age\": \"25\" }"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.InsertTPData(postData).
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
  "Message": "Data Inserted Successfully",
  "Guid": "ced293b4-23d8-490f-8944-9495bad5b003"
}
```

-----------------------------------------

### **InsertData**

`POST` : InsertData() → {JSON}

> This will insert Key value pair against the Schema given, if Schema is not found, automatically will create new Schema and insert the key value pair against the newly created schema

**Implementation**

Post Data:

```json
{
  "VESShortCode": "Test",
  "Keyword": "Label",
  "MetaData": "{ \"FirstName\": \"Aswin\",  \"City\": \"New York\", \"Age\": \"25\" }"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.InsertData(postData).
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
  "Message": "Data Inserted Successfully",
  "Guid": "ff75a6fb-c80d-465b-8801-df70bfb7f6cb"
}
```

-----------------------------------------

### **GetTidalPoolSchema**

`POST` : GetTidalPoolSchema() → {JSON}

> This will search records for given Keyword, Schema and returns all Key-value pair available in the schema. Result can be filtered with particular Guid

**Implementation**

Post Data:

```json
{
  "Keyword":"Label",
  "VESShortCode":"Test"
}
```

Code:

```js
const datalake = require('datalake');
const dl = new datalake();
dl.GetTidalPoolSchema(postData).
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
      "Guid": "ced293b4-23d8-490f-8944-9495bad5b003",
      "Keyword": "Label",
      "VESData": "{ \"FirstName\": \"Aswin\",  \"City\": \"New York\", \"Age\": \"25\" }"
    }
  ]
}
```

-----------------------------------------

### **SearchTidalPoolHash**

`POST` : SearchTidalPoolHash() → {JSON}

> This will search record for given PropertyField, PropertyValue, Keyword and SchemaName including comma(,) separated PropertyValues and range of PropertyValue

**Implementation**

Post Data:

```json
{
    "FirstName": "Aswin",
    "Keyword": "Label",
    "VESShortCode":"Test"
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

-----------------------------------------

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

-----------------------------------------

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

-----------------------------------------

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

-----------------------------------------

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

-----------------------------------------

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

-----------------------------------------

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

-----------------------------------------

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

-----------------------------------------

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

-----------------------------------------

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

-----------------------------------------

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

-----------------------------------------

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

-----------------------------------------
