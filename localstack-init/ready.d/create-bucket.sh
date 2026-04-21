#!/bin/bash
echo "Creating S3 bucket: lost-and-found-images"
awslocal s3 mb s3://lost-and-found-images
awslocal s3api put-bucket-acl --bucket lost-and-found-images --acl public-read
echo "Bucket ready."
