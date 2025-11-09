
Helps prevent WhatsApp from restricting your account by controlling message sending frequency.


When disabled, only delivery statuses are recorded. When enabled, full message content and recipient details are stored.


When enabled, messages will be marked as read automatically when received. This lets senders know you've seen their messages.


When enabled, incoming calls will be automatically rejected.


When enabled, your session will always appear online to your contacts, even when you're not actively using WhatsApp. This can be useful for business accounts to let customers know you're available.


When enabled, events will be sent to the webhook URL above.

Select which events should trigger webhook notifications.
Important
To receive notifications for incoming messages, you must selectmessages.receivedevent.
Note: Your webhook endpoint must be publicly accessible and must accept POST requests. It should respond with a 200 status code within 60 seconds. Events will be delivered as JSON payloads to your webhook URL.. For implementation details, please see thedocumentation.












































