import { expect, haveResource } from '@aws-cdk/assert';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { Test } from 'nodeunit';
import * as sources from '../lib';
import { TestFunction } from './test-function';

// tslint:disable:object-literal-key-quotes

export = {
  'sufficiently complex example'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const fn = new TestFunction(stack, 'Fn');
    const table = new dynamodb.Table(stack, 'T', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE
    });

    // WHEN
    fn.addEventSource(new sources.DynamoEventSource(table, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON
    }));

    // THEN
    expect(stack).to(haveResource('AWS::IAM::Policy', {
      "PolicyDocument": {
        "Statement": [
          {
            "Action": "dynamodb:ListStreams",
            "Effect": "Allow",
            "Resource": { "Fn::Join": [ "", [ { "Fn::GetAtt": [ "TD925BC7E", "Arn" ] }, "/stream/*" ] ] }
          },
          {
            "Action": [
              "dynamodb:DescribeStream",
              "dynamodb:GetRecords",
              "dynamodb:GetShardIterator",
            ],
            "Effect": "Allow",
            "Resource": {
              "Fn::GetAtt": [
                "TD925BC7E",
                "StreamArn"
              ]
            }
          }
        ],
        "Version": "2012-10-17"
      },
      "PolicyName": "FnServiceRoleDefaultPolicyC6A839BF",
      "Roles": [{
        "Ref": "FnServiceRoleB9001A96"
      }]
    }));

    expect(stack).to(haveResource('AWS::Lambda::EventSourceMapping', {
      "EventSourceArn": {
        "Fn::GetAtt": [
          "TD925BC7E",
          "StreamArn"
        ]
      },
      "FunctionName":  {
        "Ref": "Fn9270CBC0"
      },
      "BatchSize": 100,
      "StartingPosition": "TRIM_HORIZON"
    }));

    test.done();
  },

  'specific batch size'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const fn = new TestFunction(stack, 'Fn');
    const table = new dynamodb.Table(stack, 'T', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE
    });

    // WHEN
    fn.addEventSource(new sources.DynamoEventSource(table, {
      batchSize: 50,
      startingPosition: lambda.StartingPosition.LATEST
    }));

    // THEN
    expect(stack).to(haveResource('AWS::Lambda::EventSourceMapping', {
      "EventSourceArn": {
        "Fn::GetAtt": [
          "TD925BC7E",
          "StreamArn"
        ]
      },
      "FunctionName":  {
        "Ref": "Fn9270CBC0"
      },
      "BatchSize": 50,
      "StartingPosition": "LATEST"
    }));

    test.done();
  },

  'fails if streaming not enabled on table'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const fn = new TestFunction(stack, 'Fn');
    const table = new dynamodb.Table(stack, 'T', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      }
    });

    // WHEN
    test.throws(() => fn.addEventSource(new sources.DynamoEventSource(table, {
      batchSize: 50,
      startingPosition: lambda.StartingPosition.LATEST
    })), /DynamoDB Streams must be enabled on the table T/);

    test.done();
  },

  'fails if batch size < 1'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const fn = new TestFunction(stack, 'Fn');
    const table = new dynamodb.Table(stack, 'T', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE
    });

    // WHEN
    test.throws(() => fn.addEventSource(new sources.DynamoEventSource(table, {
      batchSize: 0,
      startingPosition: lambda.StartingPosition.LATEST
    })), /Maximum batch size must be between 1 and 1000 inclusive \(given 0\)/);

    test.done();
  },

  'fails if batch size > 1000'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const fn = new TestFunction(stack, 'Fn');
    const table = new dynamodb.Table(stack, 'T', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE
    });

    // WHEN
    test.throws(() => fn.addEventSource(new sources.DynamoEventSource(table, {
      batchSize: 1001,
      startingPosition: lambda.StartingPosition.LATEST
    })), /Maximum batch size must be between 1 and 1000 inclusive \(given 1001\)/);

    test.done();
  },

  'specific maxBatchingWindow'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const fn = new TestFunction(stack, 'Fn');
    const table = new dynamodb.Table(stack, 'T', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE
    });

    // WHEN
    fn.addEventSource(new sources.DynamoEventSource(table, {
      maxBatchingWindow: cdk.Duration.minutes(2),
      startingPosition: lambda.StartingPosition.LATEST
    }));

    // THEN
    expect(stack).to(haveResource('AWS::Lambda::EventSourceMapping', {
      "EventSourceArn": {
        "Fn::GetAtt": [
          "TD925BC7E",
          "StreamArn"
        ]
      },
      "FunctionName":  {
        "Ref": "Fn9270CBC0"
      },
      "MaximumBatchingWindowInSeconds": 120,
      "StartingPosition": "LATEST"
    }));

    test.done();
  },

  'throws if maxBatchingWindow > 300 seconds'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const fn = new TestFunction(stack, 'Fn');
    const table = new dynamodb.Table(stack, 'T', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE
    });

    // THEN
    test.throws(() =>
      fn.addEventSource(new sources.DynamoEventSource(table, {
        maxBatchingWindow: cdk.Duration.seconds(301),
        startingPosition: lambda.StartingPosition.LATEST
      })), /maxBatchingWindow cannot be over 300 seconds/);

    test.done();
  },

};
