"use strict";

var AWSregion = 'us-east-1'; // us-east-1

var Alexa = require("alexa-sdk");
var AWS = require('aws-sdk');

var docClient = new AWS.DynamoDB.DocumentClient({
    region: AWSregion
});

const crypto = require("crypto");
   
var writeResponse = ""; 
var handlers = {
    "addBudgetIntent": function() {
        var userId = this.event.session.user.userId;
        var budget = this.event.request.intent.slots.amount.value;
        var originalBudget = 0;
        var params = {
            TableName: 'Budget',
            Key: {
                id: userId
            }
        };
        readDynamoItem(params).then(
            (data, err) => {
                if (data) {
                    if (data.Item && data.Item.budget){
                        originalBudget = data.Item.budget;
                    
                        var finalBudget = parseInt(budget) + originalBudget;
                        console.log(finalBudget);
                        var params = {
                            TableName: 'Budget',
                            Key:{
                                "id": userId,
                            },
                            UpdateExpression: "set budget = :b",
                            ExpressionAttributeValues:{
                                ":b":finalBudget,
                            },
                        };
                        updateDynamoItem(params).then(
                        (data, err) => {
                            if (data) {
                                this.response.speak("Ok, I've added " + budget + 
                                    " dollars to your budget");
                                this.emit(':responseReady');
                            } else {
                                this.response.speak(err.message);
                                this.emit(':responseReady');
                            }
                        });
                    } else {
                        //create new element
                        var params = {
                            TableName: 'Budget',
                            Item: {
                                'id': userId,  
                                'budget': parseInt(budget),  
                            }
                        };
                        writeDynamoItem(params).then(
                        (data, err) => {
                            if (data) {
                                this.response.speak("I've added " + budget 
                                    + " dollars to your budget");
                                this.emit(':responseReady');
                            } else {
                                this.response.speak(err.message);
                                this.emit(':responseReady');
                            }
                        });
                    }
                } else {
                    this.response.speak(err.message);
                    this.emit(':responseReady');
                }
            });
  },
  "addToWishListIntent": function(){
    var userId = this.event.session.user.userId;
    var item = this.event.request.intent.slots.AddItem.value;
    var originalList = [];
    var params = {
        TableName: 'Wishlist',
        Limit: 100
    };
    scanDynamoItem(params).then(
        (data, err) => {
            if (data) {
                if (data.Items.length > 0){
                    data['Items'].forEach(function(element, index, array) {
                        if (element['id'] == userId){ 
                            originalList = element['wishList'];
                        }
                    });
                    
                    originalList.push(item);
                    var params = {
                        TableName: 'Wishlist',
                        Key:{
                            "id": userId,
                        },
                        UpdateExpression: "set wishList = :l",
                        ExpressionAttributeValues:{
                            ":l":originalList,
                        },
                    };
                    updateDynamoItem(params).then(
                    (data, err) => {
                        if (data) {
                            this.response.speak("Ok, I've added " + item + 
                                " to your wish list");
                            this.emit(':responseReady');
                        } else {
                            this.response.speak(err.message);
                            this.emit(':responseReady');
                        }
                    });
                } else {
                    //create new element
                    var list = [item];
                    var params = {
                        TableName: 'Wishlist',
                        Item: {
                            'id': userId,  
                            'wishList': list,  
                        }
                    };
                    writeDynamoItem(params).then(
                    (data, err) => {
                        if (data) {
                            this.response.speak("Ok, I've added " + item + 
                                " to your wish list");
                            this.emit(':responseReady');
                        } else {
                            this.response.speak(err.message);
                            this.emit(':responseReady');
                        }
                    });
                }
            } else {
                this.response.speak(err.message);
                this.emit(':responseReady');
            }
        });
  },
  "getBudgetIntent": function(){
    var userId = this.event.session.user.userId;
    var params = {
        TableName: 'Budget',
        Key:{
            id: userId
        }
    };  
    readDynamoItem(params).then(
        (data, err) => {
            if (data) {
                var response = "Your current budget is "
                 + data.Item.budget + " dollars";
                this.response.speak(response);
                this.emit(':responseReady');
            } else {
                this.response.speak(err.message);
                this.emit(':responseReady');
            }
        });
  },
  "getWishListIntent": function(){
    var userId = this.event.session.user.userId;
    var params = {
        TableName: 'Wishlist',
        Key:{
            id: userId
        }
    };
    readDynamoItem(params).then(
        (data, err) => {
            if (data) {
                var response = "You have the following items in your wish list: ";
                data.Item.wishList.forEach(function(element, index, array) {
                    response += element + ", ";
                });
                this.response.speak(response);
                this.emit(':responseReady');
            } else {
                this.response.speak(err.message);
                this.emit(':responseReady');
            }
        });
  },
  "removeWishListItemIntent": function(){
    var userId = this.event.session.user.userId;
    var item = this.event.request.intent.slots.removeItem.value;
    var params = {
        TableName: 'Wishlist',
        Key: { 'id': userId }
    };
    removeDynamoItem(params).then(
        (data, err) => {
            if (data) {
                this.response.speak("You successfully deleted " 
                    + item + " from your wish list");
                this.emit(':responseReady');
            } else {
                this.response.speak(err.message);
                this.emit(':responseReady');
            }
        });
    this.response.speak("I couldn't remove the item");
    this.emit(':responseReady');  
  },
  "LaunchRequest": function () {
    this.response.speak("Hello, Welcome to Wishy"); 
    this.emit(':responseReady');
  }
};

exports.handler = function(event, context, callback){
  var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();
};

function writeDynamoItem(params) {
    console.log('writing item to DynamoDB table');
    return docClient.put(params).promise();
}

function readDynamoItem(params) {
    console.log('reading item from DynamoDB table');
    return docClient.get(params).promise();
}

function scanDynamoItem(params) {
    console.log('reading item from DynamoDB table');
    return docClient.scan(params).promise();
}

function removeDynamoItem(params) {
    console.log('removing item from DynamoDB table');
    return docClient.delete(params).promise();
}

function updateDynamoItem(params) {
    console.log('updating item from DynamoDB table');
    return docClient.update(params).promise();
}
