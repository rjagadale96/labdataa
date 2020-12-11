// Load all the required dependencies
var express = require('express'),
    aws = require('aws-sdk'),
    bodyParser = require('body-parser'),
    multer = require('multer'),
    multerS3 = require('multer-s3');

//const mysql = require('mysql2');

// needed to include to generate UUIDs
// https://www.npmjs.com/package/uuid
const { v4: uuidv4 } = require('uuid');

// Load the SDK
var AWS = require('aws-sdk');
const { SMS } = require('aws-sdk');

aws.config.update({
//      accessKeyId: 'Your Amazon S3 Access Key',
//  secretAccessKey: 'Your Amazon S3 Secret Key',
    region: 'us-east-1'
});

var app = express(),
    s3 = new aws.S3();

app.use(bodyParser.json());


// Call S3 to list the buckets
s3.listBuckets(function(err, data) {
    if (err) {
      console.log("Error", err); //Response on error
    } else {
      console.log("Success : See your Buckets ", data.Buckets); //Response on success
    }


// configure S3 parameters to send to the connection object
app.use(bodyParser.json());


    // initialization of bucket name in the bucket list
    var bucket_name=data.Buckets[0]['Name'];

    // Storing bucket name and key value
    var upload = multer({
        storage: multerS3({
            s3: s3,
            bucket: bucket_name,
            key: function (req, file, cb) {
                cb(null, file.originalname);
            }
        })
    }); 


// initialize an DynamoDB connection object
var ddb = new aws.DynamoDB();
var dbtable = '';
ddb.listTables(function (er, dataa){
  if(er) console.log(er, er.stack);
  dbtable = dataa.TableNames[0];
  console.log(dataa.TableNames[0]);
  console.log(dbtable);
  return dbtable;
})
//POST method to upload file
app.post('/upload', upload.array('uploadFile',1), function (req, res, next) {
  // https://www.npmjs.com/package/multer
  // This retrieves the name of the uploaded file
  var fname = req.files[0].originalname;
  // Now we can construct the S3 URL since we already know the structure of S3 URLS and our bucket
  // For this sample I hardcoded my bucket, you can do this or retrieve it dynamically
  var s3url = `https://${bucket_name}.s3.amazonaws.com/` + fname;
  // Use this code to retrieve the value entered in the username field in the index.html
  var username = req.body['name'];
  // Use this code to retrieve the value entered in the email field in the index.html
  var email = req.body['email'];
  // Use this code to retrieve the value entered in the phone field in the index.html
  var phone = req.body['phone'];
  // generate a UUID for this action
  var id = uuidv4();

// configure DynamoDB parameters to send to the connection object
var params = {
  TableName: dbtable,
  Item: {
    'RecordNumber' : {S: id},
    'CustomerName' : {S: username},
    'Email' : {S: email},
    'Phone' : {S: phone},
    'S3URL' : {S: s3url},
    'Stat' : {S: stat}
  }
};


//GET method for index.html
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});



    // create the connection to database
    /*
    const connection = mysql.createConnection({
        host: dbhost,
        user: 'admin',
        password: 'iloveiit',
        database: 'company'
    });

    // simple query to test making a query from the database, not needed for this application
    connection.query(
        'SELECT * FROM `company`',
        function(errr, results) {
        console.log(results); // results contains rows returned by server
        }
    );

    // hardcoded values for testing
    //var recorddata = {RecordNumber: 45,CustomerName: 'jeremy',Email: 'hajek@iit.edu',Phone: '630-469-6411', Stat: 0, S3URL: "https"};
    var recorddata = {RecordNumber: id,CustomerName: username,Email: email,Phone: phone, Stat: 0, S3URL: s3url};

    // https://github.com/mysqljs/mysql#escaping-query-values
    // SQL INSERT STATEMENT to insert the values from the POST
    var query = connection.query('INSERT INTO company SET ?', recorddata,
        function(errr, results) {
            console.log(query.sql);
            console.log(errr);
            console.log(results); // results contains rows returned by server
        }
    );
    */
    //SNS

    // Create subscribe/sms parameters
    var params4 = {
      Protocol: SMS, /* required */
      TopicArn: 'arn:aws:sns:us-east-1:413276845105:sm-sns-topic', /* required */
      Endpoint: '+18728883497'
    };

    // Create promise and SNS service object
    var subscribePromise = new AWS.SNS({apiVersion: '2010-03-31'}).subscribe(params).promise();

    // Handle promise's fulfilled/rejected states
    subscribePromise.then(
      function(data) {
        console.log("Subscription ARN is " + data.SubscriptionArn);
      }).catch(
        function(err) {
        console.error(err, err.stack);
      });

   /* var response = client.subscribe(
      TopicArn='string',
      Protocol=sms,
      Endpoint='string',
      Attributes={
          'string': 'string'
      },
      ReturnSubscriptionArn=True|False
  )
  */

    // Code for SQS Message sending goes here
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#sendMessage-property

    // Constructing a SQS object
    var sqs = new AWS.SQS();

    //Creating queue
    var params1 = {
        QueueName: 'queuesm'
      };
      sqs.createQueue(params1, function(err2, data2) {
        if (err2) console.log(err2, err2.stack); // an error occurred
        else     console.log(data2);           // successful response
      });

      //Get queue url
      var QueUrl = '';
      var params2 = {
        QueueName: 'queuesm'
      };
      sqs.getQueueUrl(params2, function(err3, data3) {
        if (err3) console.log(err3, err3.stack); // an error occurred
        else     console.log(data3);
        QueUrl = data3.QueueUrl;        // successful response
      });

      //Sending message to queue
      var params3 = {
        MessageBody: "Hello", /* required */
        QueueUrl: QueUrl, /* required */
      };
      sqs.sendMessage(params3, function(err4, data4) {
        if (err4) console.log(err4, err4.stack); // an error occurred
        else     console.log(data4);           // successful response
      });

    // Write output to the screen
            res.write(s3url + "\n");
            res.write(username + "\n")
            res.write(fname + "\n");
            res.write(dbhost + "\n");
            res.write("File uploaded successfully to Amazon S3 Server!" + "\n");

            res.end();
});


app.get('/gallery', function (req, res) {

  /* List Content of the DyanmoDB database here or you can list the objects in S3 Bucket*/

    res.write("Gallery");
    /* list the content in a simple list via the res.write() function */
    res.write("Dynamo DB Contents")

    res.end();

  });


    //listen method to listen to the port 3300
    app.listen(3300, function () {
        console.log('Amazon s3 file upload app listening on port 3300');
    });
});

