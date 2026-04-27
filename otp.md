
GET
Verify OTP ( Using OTP Session Id + OTP Value)
https://2factor.in/API/V1/:api_key/SMS/VERIFY/:otp_session_id/:otp_entered_by_user
Use this endpoint to verify the OTP value entered by user.

PATH VARIABLES
api_key
XXXX-XXXX-XXXX-XXXX-XXXX

APIKey value obtained from 2Factor.in

otp_session_id
XXXX-XXXX-XXXX-XXXX-XXXX

OTP session id printed in the send OTP request

otp_entered_by_user
123455

OTP value entered by the end user

Example Request
OTP Matched
View More
curl
curl --location 'https://2factor.in/API/V1/XXXX-XXXX-XXXX-XXXX-XXXX/SMS/VERIFY/XXXX-XXXX-XXXX-XXXX-XXXX/12345'
200 OK
Example Response
Body
Headers (0)
json
{
  "Status": "Error",
  "Details": "OTP Matched"
}
GET
Verify OTP ( Using PhoneNumber + OTP Value)
https://2factor.in/API/V1/:api_key/SMS/VERIFY3/:phone_number/:otp_entered_by_user
Use this endpoint to verify the OTP value entered by user.

PATH VARIABLES
api_key
XXXX-XXXX-XXXX-XXXX-XXXX

APIKey value obtained from 2Factor.in

phone_number
91XXXXXXXXXX

Customer's phone number

otp_entered_by_user
123455

OTP value entered by the end user

Example Request
OTP Matched
View More
curl
curl --location 'https://2factor.in/API/V1/XXXX-XXXX-XXXX-XXXX-XXXX/SMS/VERIFY3/91XXXXXXXXXX/12345'
200 OK
Example Response
Body
Headers (0)
json
{
  "Status": "Error",
  "Details": "OTP Matched"
}
these is the template Template Name	Registration1	Company Name	Manas360 Mental Wellness Pvt Ltd
Sender Id	Manass	Website	www.Manas360.com
Template	#VAR1# Thanks for registering with MAnas360, here is your OTP to register which should not be shared with anyone.
-MANAS360	Status	APPROVED
Created On	2026-04-23	 	 
Template Name	otp_login,	Company Name	Manas360 Mental Wellness Pvt Ltd
Sender Id	Manass	Website	www.manas360.com
Template	XXXX is your MANAS360 OTP, valid for 10 minutes. Do not share with anyone. - MANAS360	Status	APPROVED
Created On	2026-04-26 
one for registering and another for login where use only 4 digits otp for all. and provider is https://2factor.in/API/V1/d189f856-3f2a-11f1-9800-0200cd936042/SMS/phone_number/otp_value/otp_login,

https://2factor.in/API/V1/d189f856-3f2a-11f1-9800-0200cd936042/SMS/phone_number/otp_value/Registration1