Introduction to PhonePe Node.js SDK

PhonePe Node.js SDK(v2.0.5) is a lightweight and secure software development kit that allows you to integrate the PhonePe Payment Gateway seamlessly into your Node.js backend systems. With this integration, you can accept a wide range of payment methods, initiate payments, check payment status, handle callbacks, and process refunds with ease.
If you choose to integrate the PhonePe Payment Gateway into your website or application using the Node.js backend SDK, here’s an overview of the end-to-end user journey.
User Journey
The following user journey illustrates the complete payment lifecycle to help you understand the integration flow clearly.


Prerequisites
Before you start the integration process, ensure you have:
Access to PhonePe PG’s UAT (User Acceptance Testing) and production environments.
SDK credentials, including the Merchant ID, Client ID, Client Secret and Client Version.
A testing environment to simulate the payment flow.
Node Version: v14 or above should be installed on your system.
npm or yarn configured as the project package manager.
You can find your Client ID and Secret in the PhonePe Business Dashboard. Set the ‘Test Mode’ toggle to ON to get Sandbox (UAT) credentials, or set it to OFF to get Production credentials.
Sample Variables
String clientId = "<clientId>";String clientSecret = "<clientSecret>";Integer clientVersion = "<clientVersion>";
Node.js SDK Integration

To integrate the PhonePe Node.js SDK, install the SDK package and initialize StandardCheckoutClient using your credentials. This sets up secure communication with PhonePe and allows the merchant to request payments, handle refunds, fetch order statuses, and verify callbacks during the payment journey.


1. Install PhonePe SDK
To start using the PhonePe Node.js SDK, first install it using the provided npm command. After installation, you will need your client ID and client secret to initialize the SDK.
To install the PhonePe SDK, refer to the SDK Installation.
2. Class Initialization
The StandardCheckoutClient class is used to connect with PhonePe. You must initialize it once using your client ID, client secret, client version, and environment. Creating multiple instances will throw a PhonePeException. Use this client to make all payment-related requests.
To set up your Client ID and Client Secret, refer to the Class Initialization.
3. Initiate Payment
Use StandardCheckoutPayRequest.build_request() to create a payment request by setting details like merchantOrder ID, amount, redirect URL, and optional metadata. Pass this request to the pay() method to get a checkout URL, which redirects the customer to complete the payment.
To initiate payments, refer to Initiate Payment.
4. Create SDK Order
Use CreateSdkOrderRequest.StandardCheckoutBuilder() to generate an order token when your backend is in Node.js and the payment is triggered from a mobile SDK. This token is needed by the frontend app to initiate the payment. Set attributes like order ID, amount, and redirect URL while building the request.
To create SDK order, refer to Create SDK Order.
5. Check Order Status
Use client.getOrderStatus(merchantOrderId) to check the current status of an order. You can choose to view either the latest payment attempt. The response includes order status, amount, and detailed payment information such as transaction state, payment mode, and error codes if any.
To create SDK order, refer to Check Order Status.
6. Initiate Refund
Use the refund() function to initiate a refund by passing the order ID, refund ID, and amount through RefundRequest.builder(). The response includes the refund status and amount refunded.
To check the status of an initiated refund, use getRefundStatus(refundId). The response provides the current refund state along with payment details such as transaction ID, payment mode, and error codes if the refund failed.
To initiate a refund and check its status, refer to Refund and Refund Status.
7. Webhook Handling
Use the validateCallback() method to verify the authenticity of a callback received from PhonePe. Pass your configured username, password, the Authorization header value, and the response body string. The method returns a CallbackResponse object that confirms if the callback is valid and includes event type, state, order or refund details, and payment information. This ensures only trusted callback events are processed in your system.
To verify the callback refer to Webhook Handling.
8. Exception Handling
Handle errors using the PhonePeException class, which captures all issues that occur during API interactions. The exception provides key details like HTTP status, error code, message, and data. Use try-catch blocks to catch exceptions and log or display error information as needed. This ensures your integration handles failures gracefully and provides clarity during debugging.
To handle errors and unexpected responses, refer to Exception Handling.
By following the above steps, you can integrate the PhonePe Node.js SDK to initiate payments, check order and refund statuses, verify callbacks, and handle exceptions, ensuring a smooth and secure payment experience for your customers.
Node.js SDK Installation

The PhonePe PG Backend SDK for Node.js(v2.0.5) is designed to simplify the process of integrating PhonePe’s payment solutions into your backend systems. It provides a structured, pre-built interface for securely interacting with PhonePe’s payment infrastructure.
This SDK helps you build a reliable and PCI-compliant payment flow with minimal effort. Ideal for server-side environments, it ensures robust communication between your application backend and the PhonePe Payment Gateway.
Minimum Supported Version
Node.js: v14 or higher
Install the SDK using npm
Use the following command to install the SDK in your Node.js project:
Installation Command
npm i @phonepe-pg/pg-sdk-node
Node.js Class Initialization

StandardCheckoutClient class will be used to communicate with the PhonePe APIs. You can initiate the instance of this class only once.
Use required credentials while initializing the object.
Parameter Name
Data Type
Mandatory
(Yes/No)
Description
client_id
Integer
Yes
Your unique client ID for secure communication with PhonePe.
client_version
String
Yes
Client version for secure communication with PhonePe.
client_secret
Integrer
Yes
Secret key provided by PhonePe Payment Gateway, which must be securely stored.
env
Enum
Yes
Environment for the client:
• PRODUCTION
• SANDBOX

Sample code
import { StandardCheckoutClient, Env } from 'pg-sdk-node';
 
const clientId = "<clientId>";
const clientSecret = "<clientSecret>";
const clientVersion = <clientVersion>;  //insert your client version here
const env = Env.SANDBOX;      //change to Env.PRODUCTION when you go live
 
const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);

Initiate Payment with Node.js SDK

The Initiate Payment step allows you to start a payment transaction by creating a payment request with essential details like order ID, amount, and redirect URL. This request prepares the transaction on PhonePe’s platform and generates a redirect URL where users complete their payment securely.
Request
Use StandardCheckoutPayRequest.build_request() to create the payment request. Below are the key attributes you can set:
Parameter Name
Data Type
Mandatory
(Yes/No)
Description
Constraints
merchantOrderId
String
Yes
Unique order ID assigned by you
Max length: 63 characters, no special characters except “_” and “-”
amount
Long
Yes
Order amount in paisa
Minimum value: 100 (in paisa)
metaInfo
Object
No
Meta information is defined by you to store additional information. The same data will be returned in status and callback response.


metaInfo.udf1-5
String
No
Optional details you can add for more information.
Maximum length = 256 characters 
redirectUrl
String
No
URL to which the user will be redirected after the payment (success or failure)


expireAfter
Long
No
Set a orders expiry time in seconds.


message
String
No
Payment message shown in APP for collect requests.



Sample Request
import { StandardCheckoutClient, Env, MetaInfo, StandardCheckoutPayRequest } from '@phonepe-pg/pg-sdk-node';
import { randomUUID } from 'crypto';
 
const clientId = "<clientId>";
const clientSecret = "<clientSecret>";
const clientVersion = <clientVersion>;    //insert your client version here
const env = Env.SANDBOX;        //change to Env.PRODUCTION when you go live
 
const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
 
const merchantOrderId = randomUUID();
const amount = 100; // Amount in paise (100 = ₹1.00)
const prefillUserLoginDetails = PrefillUserLoginDetails.builder()
    .phoneNumber("<PhonepeNumber>")
const metaInfo = MetaInfo.builder()
    .udf1("udf1")
    .udf2("udf2")
    .udf3("udf3")
    .build();

const orderRequest = CreateSdkOrderRequest.StandardCheckoutBuilder()
    .merchantOrderId(merchantOrderId)
    .amount(amount)
    .prefillUserLoginDetails(prefillUserLoginDetails)
    .metaInfo(metaInfo)
    .redirectUrl("https://www.merchant.com/redirect")
    .expireAfter(3600)
    .message("Message that will be shown for UPI collect transaction")
    .build();
 
client.pay(request).then((response)=> {
    const checkoutPageUrl = response.redirectUrl;
})
Response
The function returns a StandardCheckoutPayResponse object with the following properties:
Attribute
Data Type
Description
state
String
State of the order created, expected value is PENDING.
redirect_url
String
URL for the PhonePe Payment Gateway Standard Checkout page. This is the URL to which the user should be redirected for payment.
order_id
String
A unique internal order ID generated by PhonePe PG.
expire_at
String
Order expiry timestamp in epoch.

Create Order with Node.js SDK

Create SDK Order is to generate an order token when your backend is in Node.js and you’re integrating with any mobile app. This lets your frontend app get the Order token it needs to start the payment requests.
Request
You can use CreateSdkOrderRequest.StandardCheckoutBuilder() to create the request. You can pass the following attributes.
Parameter Name
Data Type
Mandatory
(Yes/No)
Description
Constraints
merchantOrderId
String
Yes
Unique order ID assigned by you.
Max Length = 63 characters
amount
Long
Yes
Order amount in paisa.
Minimum value: 100 (in paisa)
disablePaymentRetry
Boolean
No
Setting this field to true will disable retries on standard checkout payment page.


redirectUrl
String
Yes
URL to which the user will be redirected after the payment (success or failure).



Sample Request
import { StandardCheckoutClient, Env, MetaInfo, StandardCheckoutPayRequest } from '@phonepe-pg/pg-sdk-node';
import { randomUUID } from 'crypto';
 
const clientId = "<clientId>";
const clientSecret = "<clientSecret>";
const clientVersion = <clientVersion>;  //insert your client version here
const env = Env.SANDBOX;      //change to Env.PRODUCTION when you go live
 
const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
 
const merchantOrderId = randomUUID();
const amount = 1000;
const redirectUrl = "https://redirectUrl.com";
 
const request = CreateSdkOrderRequest.StandardCheckoutBuilder()
        .merchantOrderId(merchantOrderId)
        .amount(amount)
        .disablePaymentRetry(true)         
        .redirectUrl(redirectUrl)
        .build();
 
client.createSdkOrder(request).then((response) => {
    const token = response.token
})
Response
The function returns a CreateOrderResponse object with the following properties:
Property
Data Type
Description
orderId
String
Order ID generated by PhonePe PG.
state
String
State of an Order. Initially it will be PENDING.
expireAt
Long
Expiry time in epoch.
token
String
Token used by the merchant UI to initiate order.

Check Order Status with Node.js SDK

It is used to check the status of an order.
Request
The request parameters are as follows:
Parameter Name
Data Type
Mandatory
(Yes/No)
Description
merchantOrderId
String
Yes
The merchant order ID for which the status is fetched.
details
Boolean
No
• true → Returns all payment attempt details under the paymentDetails list.
• false → Returns only the latest payment attempt details.

Sample Request
import { StandardCheckoutClient, Env, MetaInfo, StandardCheckoutPayRequest } from '@phonepe-pg/pg-sdk-node';
 
const clientId:string = "<clientId>";
const clientSecret:string = "<clientSecret>";
const clientVersion:string = <clientVersion>;  //insert your client version here
const env:Env = Env.SANDBOX;      //change to Env.PRODUCTION when you go live
 
const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
 
const merchantOrderId = '<MERCHANT_ORDER_ID>';                    //Order Id used for creating new order
 
client.getOrderStatus(merchantOrderId).then((response) => {
  const state = response.state;
});
Response
The function returns an OrderStatusResponse object with the following properties:
Property
Data Type
Description
order_id
String
Order ID generated by PhonePe PG.
state
String
Current state of the order: Expected values:
• PENDING
• FAILED
• COMPLETED
amount
Long
Order amount in paisa.
expire_at
Long
Expiry time of the order in epoch.
metaInfo
MetaInfo
Meta information provided by you during order creation.
payment_details
List<PaymentDetail>

List of payment attempt details corresponding to the order.

The paymentDetails property contains a list of payment details for each payment attempt made against an order. The details of each payment are explained in the table below.
Property
Data Type
Description
transactionId
Integer
The transaction ID generated by PhonePe PG.
paymentMode
String
The payment method used
• UPI_INTENT
• UPI_COLLECT
• UPI_QR
• CARD
• TOKEN
• NET_BANKING
timestamp
Long
Timestamp of the attempted transaction in epoch.
amount
Integer
Order amount in paisa.
state
String
Attempted transaction state. It can be any one of the following states:
• PENDING
• COMPLETED
• FAILED
errorCode
String
Error code (only if the transaction failed)
detailedErrorCode
String
A more detailed error code (only if the transaction failed)
splitInstruments
list<InstrumentCombo>
Contains split instrument details of all the transactions made.

splitInstruments provides a list of InstrumentCombo objects. Details of each InstrumentCombo object are explained in the table below.
list
Property
Data Type
Type
instrument
PaymentInstrumentV2
Instrument used for the payment.
rails
PaymentRail
Rail used for the payment.
amount
Integer
Amount transferred using the above instrument and rail.

Initiate and Verify Refunds with Node.js SDK

It is used to initiate a refund using refund() function. This ensures the amount is returned to the customer’s original payment method.
Initiate Refund Request
You can use the RefundRequest.builder() to create the refund request and the following are the attributes that merchant can pass.
Parameter Name
Data Type
Mandatory
(Yes/No)
Description
Constraints
merchantRefundId
String
Yes
Unique refund ID assigned by you.
Max Length = 63 characters.
originalMerchantOrderId
String
Yes
The original order ID against which the refund is requested.


amount
Integer
Yes
Refund amount in paisa. Must be at least 1 paisa and not exceed the order amount.
Min value = 100 (in Paise), Max value = order amount.

⚠️ Invalid Refund Amount!

The refund amount cannot exceed the initiated amount. It must always be less than or equal to the amount originally initiated.
Sample Request
import { StandardCheckoutClient, Env, MetaInfo, StandardCheckoutPayRequest } from '@phonepe-pg/pg-sdk-node';
import { randomUUID } from 'crypto';
 
const clientId = "<clientId>";
const clientSecret = "<clientSecret>";
const clientVersion = <clientVersion>;  //insert your client version here
const env = Env.SANDBOX;      //change to Env.PRODUCTION when you go live
 
const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
 
const refundId = randomUUID();
const originalMerchantOrderId = '<MERCHANT_ORDER_ID>';    //merchantOrderId for which order has to be initiated
const amount = 100                                      //amount to be refund
 
const request = RefundRequest.builder()
    .amount(amount)
    .merchantRefundId(refundId)
    .originalMerchantOrderId(originalMerchantOrderId)
    .build();
 
client.refund(request).then((response) => {
    const state = response.state
})
Refund Initiation Response
The function returns a RefundResponse object with the following properties:
Property
Data Type
Description
refundId
String
Refund ID generated by PhonePe PG.
state
String
The status of the refund.
amount
Long
The refunded amount (in paisa).

Check Refund Status
It is used to retrieve the status of a refund using getRefundStatus() function.
Refund Status Request
Request Parameters
Parameter Name
Data Type
Mandatory
(Yes/No)
Description
refundId
String
Yes
Refund ID assigned by you at the time of initiation

Sample Request
import {StandardCheckoutClient, Env} from 'pg-sdk-node';
 
const clientId = "<clientId>";
const clientSecret = "<clientSecret>";
const clientVersion = <clientVersion>;  //insert your client version here
const env = Env.SANDBOX;      //change to Env.PRODUCTION when you go live
 
const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
 
const refundId = '<REFUND_ID>'; //refundId used to initiate the refund
 
client.getRefundStatus(refundId).then((response) => {
    const state = response.state
})
Refund Status Response
It returns a RefundStatusResponse Object.
Response Parameters
Property
Data Type
Description
merchantId
String
Order ID generated by PhonePe PG.
merchantRefundId
String
The refund ID created at the time of refund initiation.
state
String
The status of the refund.
amount
Integer
Amount to refund.
paymentDetails
List<PaymentRefundDetail>
List of payment attempt details corresponding to the order.

The PaymentRefundDetail property contains a list of payment details for each payment attempt made against an order. The details of each payment are explained in the table below.
Property
Data Type
Description
transactionId
Integer
The transaction ID generated by PhonePe PG.
paymentMode
String
The payment method used
• UPI_INTENT
• UPI_COLLECT
• UPI_QR
• CARD
• TOKEN
• NET_BANKING
timestamp
Long
Timestamp of the attempted transaction in epoch.
amount
Integer
Order amount in paisa.
state
String
Attempted transaction state. It can be any one of the following states:
• PENDING
• COMPLETED
• FAILED
errorCode
String
Error code (only if the transaction failed)
detailedErrorCode
String
A more detailed error code (only if the transaction failed)
splitInstruments
list<InstrumentCombo>
Contains split instrument details of all the transactions made.

Handle Webhooks with Node.js SDK

Use callback verification to confirm that the callback you received from PhonePe is authentic.
The standard_phonepe_client.validate_callback method is used to validate webhook or callback responses. You can use this method by passing all the necessary parameters.
Request
The request parameters are as follows:
Request Parameters
Parameter Name
Data Type
Description
username
String
Your unique username configured for the callback URL
password
String
Your unique password configured for the callback URL
authorization
String
The Authorization token sent in the callback response
responseBody
String
The actual response body received in the callback as a string

Sample Request
import { StandardCheckoutClient, Env } from 'pg-sdk-node';
 
const clientId = "<clientId>";
const clientSecret = "<clientSecret>";
const clientVersion = <clientVersion>;  //insert your client version here
const env = Env.SANDBOX;      //change to Env.PRODUCTION when you go live
 
const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
 
const authorizationHeaderData = "ef4c914c591698b268db3c64163eafda7209a630f236ebf0eebf045460df723a" // received in the response headers
const phonepeS2SCallbackResponseBodyString = "{\"type\": \"PG_ORDER_COMPLETED\",\"payload\": {}}"  // callback body as string
  
const usernameConfigured = "<MERCHANT_USERNAME>"
const passwordConfigured = "<MERCHANT_PASSWORD>" 
 
const callbackResponse = client.validateCallback(
    usernameConfigured,
    passwordConfigured,
    authorizationHeaderData,
    phonepeS2SCallbackResponseBodyString );
 
const orderId = callbackResponse.payload.orderId;
const state = callbackResponse.payload.state;
Response
The function returns a CallbackResponse object containing two main parameters: type, which indicates the event type, and payload, which holds all the event-specific details.
Parameter Name
Data Type
Description
type
CallbackType
Tells you what type of event happened (e.g., order completed, refund failed, etc.)
payload
CallbackData
Contains all the details related to that event

The event type are explained below:
Callback Type
Description
CHECKOUT_ORDER_COMPLETED
The payment was successfully completed
CHECKOUT_ORDER_FAILED
The payment failed
PG_REFUND_COMPLETED
A refund was successfully processed
PG_REFUND_FAILED
A refund request failed
PG_REFUND_ACCEPTED
PhonePe Payment Gateway acknowledged the refund request, but it’s not completed yet

The payload details are explained below:
CallbackData
Parameter Name
Data Type
Description
merchantId
String
Merchant ID from which the request was initiated
orderId
String
Order ID generated by PhonePe Payment Gateway (only for order callbacks)
originalMerchantOrderId
String
Order ID generated by you (only for order callbacks)
refundId
String
Refund ID generated by PhonePe PG (only for refund callbacks)
merchantRefundId
String
Refund ID generated by you (only for refund callbacks)
state
String
The current state of the order or refund.
amount
Long
The amount processed in paisa.
expireAt
Long
The expiry timestamp in epoch format
errorCode
String
The error code (only for failed transactions)
detailedErrorCode
String
A more detailed error code (only for failures)
metaInfo
MetaInfo
Metadata passed during order initialization
paymentDetails
List<PaymentDetail>
The Payment details of the transaction

The PaymentRefundDetail property contains a list of payment details for each payment attempt made against an order. The details of each payment are explained in the table below.
Attribute
Data Type
Description
transactionId
String
Merchant ID from which the request was initiated
paymentMode
String
Order ID generated by PhonePe Payment Gateway (only for order callbacks)
timestamp
Long
Order ID generated by you (only for order callbacks)
state
String
Attempted transaction state. It can be any one of the following states:
• COMPLETED
• FAILED
• PENDING
errorCode
String
Error code (only present when the state is failed)
detailedErrorCode
String
A more specific error code (only present when the state is failed)

Exception Handling
Exception handling in the PhonePe SDK is managed through the PhonePeException, which captures errors related to PhonePe APIs. It provides detailed information such as HTTP status code, error code, message, and additional error data to help identify and resolve issues effectively.
PhonePeException
Exception raised for errors related to PhonePe APIs.
Attribute
Description
code
The status code of the http response.
message
The http error message.
httpStatusCode
The status code of the http response.
data
The details of the error that happened while calling PhonePe.

Sample Request
import { StandardCheckoutPayRequest, StandardCheckoutPayResponse } from 'pg-sdk-node';
import { v4 as uuid } from 'uuid';
 
const merchantOrderId = uuid();
const redirectUrl = 'https://www.merchant.com/redirect';
 
const request = StandardCheckoutPayRequest.builder()
  .merchantOrderId(merchantOrderId)
  .redirectUrl(redirectUrl)
  .build();
 
client.pay(request).then((response) => {
  const checkoutPageUrl = response.redirectUrl;
}).catch((error) => {
    const error = error as PhonePeException;  //error thrown is of PhonePeException type
    console.log(error.message);
});
Response
InstrumentCombo
Represents a combination of the payment instrument and the payment rail used to complete a transaction.
Property Parameters
Property
Type


instrument
PaymentInstrumentV2
Instrument used for the payment.
rails
PaymentRail
Rail used for the payment.
amount
long
Amount transferred using the above instrument and rail.

PaymentRail
Defines the type of rail used to initiate payment.
UPI RAIL
Property
Type
type
PaymentRailType
utr
String
upi_transaction_id
String
vpa
String

PG RAIL
Property
Type
type
PaymentRailType
transaction_id
String
authorization_code
String
service_transaction_id
String

PaymentInstrumentV2
Represents the instrument used to initiate a payment. Various instrument types are listed below:
ACCOUNT
Property
Type
type
PaymentInstrumentType
ifsc
String
account_type
String
masked_account_number
String
account_holder_name
String

CREDIT_CARD
Property
Type
type
PaymentInstrumentType
bank_transaction_id
String
bank_id
String
arn
String
brn
String

DEBIT_CARD
Property
Type
type
PaymentInstrumentType
bank_transaction_id
String
bank_id
String
arn
String
brn
String

NET_BANKING
Property
Type
type
PaymentInstrumentType
bank_transaction_id
String
bank_id
String
arn
String
brn
String

EGV
Property
Type
type
PaymentInstrumentType
cardNumber
String
programId
String

WALLET
Property
Type
type
PaymentInstrumentType
walletId
String

Merchant Integration Checklist
UAT Sign-Off Process
Once your integration is completed, you must share your UAT instance for end-to-end flow verification.
Any issues identified during the UAT stage must be resolved and reverified by your integration point of contact (POC) in the same UAT environment.
The UAT sign-off will be provided only after all required use cases are successfully handled.
Once sign-off is granted, you must acknowledge it to proceed further and receive Production Credentials.
API-Wise Checklist
This checklist helps ensure that you have addressed all the necessary use cases during your integration phase, leading to a smoother UAT closure.
ℹ️ Must-Do!

All use cases listed below are mandatory and must be implemented.
1. Authorization API
You must use the expires_at parameter in the response to manage your token lifecycle.
Option 1: Validate Token Before Each Request
Before making any API request:
If the token is active: reuse it.
If expired: call the Authorization API to generate a new one and use it.
Option 2: Scheduled Token Renewal
Set up a scheduler to regenerate the token 3–5 minutes before its actual expiry using the Authorization API.
⚠️ Avoid Unnecessary Token Calls!

Do not call the Authorization API before every request without first checking the token’s expiry.
2. Payment API
Request Parameters
merchantOrderId: Always pass a unique ID for each transaction.
expireAfter: Defines order expiry in seconds. If not passed, default value will be used. 
For Standard Checkout: Min = 300, Max = 3600 seconds.
amount: Must be passed in Paise (₹ × 100).
udf in metaInfo: Use only if needed. Remove unused fields instead of leaving them empty.
paymentFlow.redirectUrl: Provide your redirection URL where users should be returned after payment.
paymentFlow.type: Set this to PG_CHECKOUT.
Response Fields
orderId: PhonePe-generated Order ID. You should map this with your merchantOrderId.
redirectUrl: PhonePe Checkout URL. You must use this exactly as received, without modifications.
3. Order Status API
Avoid strict deserialization of the response.
Use the root-level state parameter to determine payment status:
COMPLETED → Payment Successful
FAILED → Payment failed
PENDING → Payment in progress
Handling PENDING Transactions
If the transaction status is PENDING, there are two handling options:
Option 1: Mark as Failed
Show a Payment Failed page to the user.
Reconcile the transaction status on the server side until the terminal status (COMPLETED or FAILED) is reached.
If the final status is COMPLETED, then initiate a Refund. Note: For this use case, it is strongly recommended to integrate the Refund API.
Option 2: Mark as Pending
Show a Payment Pending page to the user.
Reconcile the transaction status on the backend until the terminal status (COMPLETED or FAILED) is determined.
If the final status is COMPLETED, the order can be fulfilled accordingly.
Reconciliation Schedule (Mandatory)
When the transaction state is PENDING, you must call the Order Status API as per the below schedule:
First status check: 20–25 seconds after transaction initiation.
Then:
Every 3 seconds for the next 30 seconds
Every 6 seconds for the next 60 seconds
Every 10 seconds for the next 60 seconds
Every 30 seconds for the next 60 seconds
Every 1 minute until the terminal status is reached
(Or until the expireAfter value passed in the request is reached)
4. Webhook Handling
Avoid strict deserialization of the webhook payload.
Rely only on the payload.state field for payment status.
Ignore the type parameter (deprecated) and use the event field instead.
expireAt and timestamp are epoch timestamps in milliseconds.
Webhook Validation (Mandatory)
Once you receive a webhook, calculate the Authorization header value as SHA256(username:password) and compare it with the value sent in the headers.
If they match: process the update.
If not: discard the webhook and refer to the Order Status API for the latest update.
Webhook Setup
UAT: Share your UAT webhook URL with the integration team to get it configured.
Production: Configure your webhook directly via the PhonePe Business Dashboard.
5. Refund API
This section applies only if you initiate refunds via API (not through the dashboard).
Required Parameters
merchantRefundId: Must be unique for every refund.
originalMerchantOrderId: Pass the original order ID for which the refund is being issued.
amount: Enter the refund amount in Paise (₹ × 100).
After you initiate a refund, the status will start as PENDING. The updated status must be tracked via Webhook and Refund Status API — both are mandatory.
6. Refund Status API
Avoid strict deserialization.
Use the root-level state to track refund progress:
PENDING → Refund is being processed.
CONFIRMED → Still in progress, not yet final.
COMPLETED → Refund successfully completed.
FAILED → Refund failed — must be retried.
Handling Ongoing Refunds
If you receive the state parameter as PENDING or CONFIRMED in the Refund API response, then the Refund Status API with the merchantRefundId should be called for this refund transaction until the final state COMPLETED/FAILED is reached.
The Scheduler/Cron Job must be set as per your convenience to get the terminal state.
Also, make sure not to initiate another refund for the same transaction while previous refund transaction is still in the PENDING or CONFIRMED state.
If you receive the state parameter as COMPLETED in the Refund Order Status API response, then the refund has been processed successfully.
If you receive the state parameter as FAILED in the Refund Order Status API response, then the refund transaction has failed and the refund has to be reinitiated again with a unique merchantRefundId.
UAT Sandbox
The UAT Sandbox allows you to simulate end to end payment flows and test your integration thoroughly. It uses templates that map APIs to predefined sample responses, enabling you to simulate various scenarios such as payment Success, Failure, and Pending without real transactions.
Benefits of using the UAT Sandbox
Even if the PhonePe UAT server is unavailable, the UAT Sandbox ensures a smooth testing experience. You can continue validating payment flows without disruptions.
Simulate various payment outcomes such as success, failure, and pending states. This helps ensure your integration handles all real-world scenarios reliably.
Thoroughly test the entire payment lifecycle from initiation to response. This ensures a stable and seamless experience when you move to production.
Verifying Payment Lifecycle Using the UAT Sandbox
The PhonePe UAT Sandbox offers various ways to verify the payment lifecycle across multiple payment methods. It allows you to simulate real world scenarios like success, failure, and pending statuses for comprehensive end to end testing even when the UAT server is unavailable.
Follow the steps below to efficiently simulate, validate, and debug different payment flows in a controlled testing environment.
1. Simulate Payment Flows on Standard Checkout
Follow the steps below to verify different payment methods on the Standard Checkout page using the PhonePe UAT Sandbox.
Update the Host URL for UAT Sandbox (PG Pay and PG Check Status APIs)
To begin testing, replace the default host URL with the UAT Sandbox endpoint in your integration environment. This helps route all payment and status check requests to the sandbox for simulation.
UAT Host URL: https://api-preprod.phonepe.com/apis/pgsandbox
1.1 Install and Set Up the PhonePe Test App
To validate payment flows using the PhonePe Test App:
Android: [Download here] (Package Name: com.phonepe.simulator)
iOS: Share your email ID with the PhonePe Integration Team on the integration thread. You will receive an invite via Firebase.
⚠️ Allow Developer Access to Proceed!

If you see “Untrusted Enterprise Developer”, follow these steps to trust the developer and continue with the installation.
Follow these steps to proceed with installation:


Go to Settings > General > VPN & Device Management.
Tap on the Developer App.
Select Trust [Developer].
Confirm by selecting Trust again.
2. Simulate UPI QR Payments
Do not use the PhonePe Test App to scan the QR code.
There is no need to manually set the template for success, failure, or pending scenarios.
Instead, scan the UAT QR using any production version of the PhonePe app or other UPI apps.
A link will appear on the screen and you can tap to open it in your browser.
Once the link is opened, you can choose between “Success”, “Failure”, or “Pending” based on the flow you want to test. The template will be automatically applied according to your selection.


3. Simulate Card and NetBanking Transactions
There is no need to manually set the template for success, failure, or pending scenarios.
Instead, you will be redirected to a page where you can choose Success, Failure, or Pending based on the flow you want to test. The template will be automatically set according to your selection.


Setting Up Your Test Environment
Click on “Test Case Templates” to configure Success, Failure, or Pending scenarios specifically for the PayPage UPI Intent flow.


Configure Template for PayPage UPI Intent Flow
To set up the required template for PayPage UPI Intent flow:
Open the PhonePe Test App and tap on Test Case Templates.
Enter your Merchant ID and click Get Configured Templates.
If a template is already configured, it will be displayed.
If not, you will see No Template Configured.
For PG Integration, select the flow: Custom and Standard Checkout V2.
Configure the template based on your test scenario: Success, Failure, or Pending.
Download the Demo Video
Steps to Configure Template
Ensure you configure the correct templates specifically for Standard Checkout integration.
Templates related to Standard Checkout begin with the keyword: “Paypage”.
Select the appropriate template that matches the flow you want to simulate.


Templates for PayPage UPI Intent
Use the following templates to simulate different outcomes for PG – Mobile Intent flows:
Success: Paypage Upi Intent Success
Failure: Paypage Upi Intent Failure
Pending: Paypage Upi Intent Pending

Test Card Details
Use the below test cards to simulate card transactions in the UAT environment.
Credit Card
Card Number: 4208 5851 9011 6667
Card Type: CREDIT_CARD
Issuer: VISA
Expiry: 06/2027
CVV: 508
Debit Card
Card Number: 4242 4242 4242 4242
Card Type: DEBIT_CARD
Issuer: VISA
Expiry: 12/2027
CVV: 936
ℹ️ Simulation OTP

Use OTP 123456 on the bank page to complete the transaction simulation.
Go Live Process
After completing your integration, share the testing URL/App with the PhonePe Integration Team for a final sanity check.
Once the integration is verified in UAT, UAT Sign-off will be provided, and Production credentials will be shared with you by PhonePe.
Follow the steps below to migrate from UAT to Production and go live:
1. Replace Host URLs
Update the API host endpoints from UAT to Production as follows:
APIs
Production Host URLs
Auth Token API
https://api.phonepe.com/apis/identity-manager
Other APIs (Payment, Status, Refund)
https://api.phonepe.com/apis/pg

2. Replace Client ID and Secret Key
Use your Production credentials:
Replace the UAT Client ID and Client Secret with your Production Client ID and Client Secret to generate the Production Auth Token.
3: Generate Production Auth Token
Call the Auth Token API using your production credentials and use the generated token in all production API calls:
Payment Initiation
Order Status
Refund
SDK Configuration for Production
Android SDK
Initialize the PhonePe SDK using PhonePeEnvironment.RELEASE
Set enableLogging to false
appId is optional and can be passed as null or ""
Code Reference
val result = PhonePeKt.init(
  context = this,
  merchantId = "MID",
  flowId = "FLOW_ID",
  phonePeEnvironment= PhonePeEnvironment.RELEASE,
  enableLogging = false,
  appId = null 
)
iOS SDK
Initialize the PhonePe SDK with environment as .production
Set enableLogging to false
Code Reference
let ppPayment = PPPayment(environment: .production,
                          merchantId: "MERCHANT_ID",
                          enableLogging: false)
You are now ready to go live with your PhonePe integration in the Production environment.
With UAT successfully completed and the Production credentials in place, all necessary steps have been covered to ensure a smooth transition.
Hybrid SDK
Initialize the PhonePe SDK init method as below
environment as PRODUCTION
merchantId with Production MID
Make sure the enableLogging flag is set to False in Production.
We wish you a successful go-live and continued operational excellence.
— PhonePe Integration Team

