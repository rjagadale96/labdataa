// Install these packages via npm: npm install express aws-sdk multer multer-s3

var express = require('express'),
    aws = require('aws-sdk'),
    bodyParser = require('body-parser'),
    multer = require('multer'),
    multerS3 = require('multer-s3');
      
const mysql = require('mysql2');


const { v4: uuidv4 } = require('uuid');

var fname;
var username;
var s3url;
var email;
var phone;
var id;

aws.config.update({
    region: 'us-east-1'
});

// initialize an s3 connection object
var app = express(),
    s3 = new aws.S3();

// configure S3 parameters to send to the connection object
app.use(bodyParser.json());
var AWS = require('aws-sdk');
// I hardcoded my S3 bucket name, this you need to determine dynamically


s3.listBuckets(function(err,data){

        if(err) console.log(err, err.stack);
        else {
                //console.log(data.Buckets[0] + " bucket");
                //data1 = data.Buckets[0].Name;
        }

        var data1 = "";
        for (let i=0; i< data.Buckets.length; i++){
          	if(data.Buckets[i]['Name'].startsWith('fall')){
             	 	data1 = data.Buckets[i]['Name'];
              		console.log("bucketname "+data1);
        	}
	}
//});
console.log(data1)
var upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: data1,
        key: function (req, file, cb) {
            cb(null, file.originalname);
            }
    })
});



var ddb = new aws.DynamoDB();
var dbtable = '';
ddb.listTables(function (er, dataa){
  if(er) console.log(er, er.stack);
  dbtable = dataa.TableNames[0];
  console.log(dataa.TableNames[0]);
  console.log(dbtable);
  return dbtable;
})

// configure DynamoDB parameters to send to the connection object
var params = {
  TableName: dbtable,
  Item: {
    'RecordNumber' : {S: id},
    'CustomerName' : {S: username},
    'Email' : {S: email},
    'Phone' : {S: phone},
    'S3URL' : {S: s3url}
  }
};

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.post('/upload', upload.array('uploadFile',1), function (req, res, next) {

fname = req.files[0].originalname;
// Now we can construct the S3 URL since we already know the structure of S3 URLS and our bucket
// For this sample I hardcoded my bucket, you can do this or retrieve it dynamically
s3url = `https://${data1}.s3.amazonaws.com/` + fname;
// Use this code to retrieve the value entered in the username field in the index.html
username = req.body['name'];
// Use this code to retrieve the value entered in the email field in the index.html
email = req.body['email'];
// Use this code to retrieve the value entered in the phone field in the index.html
phone = req.body['phone'];
// generate a UUID for this action
id = uuidv4();


// Create subscribe/sms parameters
var params4 = {
  Protocol: 'sms', /* required */
  TopicArn: 'arn:aws:sns:us-east-1:844172240973:rbj-sns-topic', /* required */
  Endpoint: '+13125227451'
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



//get qurl
var sqs = new aws.SQS({apiVersion: '2012-11-05'});

var QUrl = '';
var p1 = {
    QueueName: 'rbj-sqs-itmo-544', /* required */
  };
  sqs.createQueue(p1, function(e2, d2) {
    if (e2) console.log(e2, e2.stack); // an error occurred
    else     console.log(d2);           // successful response
  });

  var p2 = { 
    QueueName: 'rbj-sqs-itmo-544',
  };
  sqs.getQueueUrl(p2, function(err, data) {
    if (err) {
	    console.log(err, err.stack); // an error occurred
    }
    else{
	    console.log(data);// successful response
	    QUrl = data.QueueUrl;
    }
});



//send message
var p3 = {
    MessageBody: id, /* required */
    QueueUrl: QUrl, /* required */
  };
  sqs.sendMessage(p3, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });

// Write output to the screen
        res.write(s3url + "\n");
        res.write(username + "\n")
        res.write(fname + "\n");
        res.write(dbtable + "\n");
        res.write("File uploaded successfully to Amazon S3 Server!" + "\n");
      
        res.end();
});

app.get('/gallery', function (req, res) {
  
    res.write("Gallery");
    
    res.end();
  
  });


app.listen(3300, function () {
    console.log('Amazon s3 file upload app listening on port 3300');
});
});
