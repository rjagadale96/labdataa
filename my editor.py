import boto3
import os
import sys
import uuid
from urllib.parse import unquote_plus
from PIL import Image, ImageFilter
import PIL.Image
import mysql.connector



#s3_client = boto3.client('s3')

client = boto3.client('sns','us-east-1')

sqs = boto3.resource('sqs',region_name='us-east-1')

# https://boto3.amazonaws.com/v1/documentation/api/latest/guide/sqs.html#processing-messages
# Get the queue
queue = sqs.get_queue_by_name(QueueName='queuemv')

# Process messages by printing out body and optional author name
for message in queue.receive_messages():
  # Print out the body and author (if set)
    print(message.body)
    msg = message.body


#DynamoDB

dynamodb = boto3.resource('dynamodb', endpoint_url="https://dynamodb.us-east-1.amazonaws.com")

table = dynamodb.Table('Company')

response = table.scan()
data= response['Items']
print("records of dynamodb")
name = data[0]['CustomerName']
Email = data[0]['Email']
Phone = data[0]['Phone']
S3URL = data[0]['S3URL']

print(data)

#Image 

s3 = boto3.resource('s3','us-east-1')
s3Client = boto3.client('s3','us-east-1')
x=0
bucket1 = ""
bucket2 = ""
for bucket in s3.buckets.all():
    if(x==0):
        bucket1=bucket.name
        x=x+1
    elif(x==1):
        bucket2=bucket.name
        x=x+1
print("bucket1 =" + bucket1 + " bucket= "+bucket2)

# s3.download_file('BUCKET_NAME', 'OBJECT_NAME', 'FILE_NAME')
s3Client.download_file(bucket2, 'data.png', "/tmp/image-minu.png")

# Process image with PIL 
# use sample code from render-image.py
im = Image.open( "/tmp/image-minu.png" )
size = (100, 100)
im.thumbnail(size, Image.ANTIALIAS)
background = Image.new('RGBA', size, (255, 255, 255, 0))
background.paste(
    im, (int((size[0] - im.size[0]) / 2), int((size[1] - im.size[1]) / 2))
)
background.save("/tmp/thumbnail.png")



# Put Image Object back into S3 Bucket
# use source code from upload-image-to-s3.py

s3.Object(bucket1, "rendered-image-minu-uuid.png").upload_file("/tmp/thumbnail.png")

#DB table update
response = table.update_item(
    Key={
        'Email': Email,
        'S3URL': S3URL
        },
        UpdateExpression="set Stat=:s",
        ExpressionAttributeValues={
            ':s': 1,

        },
        ReturnValues="UPDATED_NEW"
)


#SNS message publish

response = client.publish(
    PhoneNumber=Phone,
    Message="Hello"+name+". Your image has been rendered”,
    Subject="AWS Message"
)


#SQS message delete
message.delete()