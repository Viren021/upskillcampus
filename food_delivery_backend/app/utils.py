from passlib.context import CryptContext
from twilio.rest import Client

# --- 1. PASSWORD HASHING (Keep this!) ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash(password: str):
    return pwd_context.hash(password)

def verify(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


# --- 2. SMS NOTIFICATIONS (New Addition) ---


TWILIO_SID = "use_your_twilio_sid_here"
TWILIO_AUTH_TOKEN = "use_your_twilio_auth_token_here"
TWILIO_PHONE_NUMBER = "+use_your_twilio_phone_number_here" 

# Initialize Client (Only if keys are present to avoid crashes)
try:
    sms_client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
except:
    sms_client = None

def send_sms(phone_number: str, message_body: str):
    """
    Sends an SMS to the given phone number.
    Handles +91 prefixing automatically.
    """
    # 1. Auto-Fix Phone Number
    clean_phone = phone_number.strip()
    if not clean_phone.startswith("+"):
        clean_phone = "+91" + clean_phone  # Adjust country code if needed

    try:
        # 2. Send via Twilio
        if sms_client:
            message = sms_client.messages.create(
                body=message_body,
                from_=TWILIO_PHONE_NUMBER,
                to=clean_phone
            )
            print(f"✅ SMS Sent to {clean_phone}: {message.sid}")
            return True
        else:
            print("⚠️ Twilio Client not initialized (Check keys in utils.py)")
            return False

    except Exception as e:
        # 3. Fallback Log
        print(f"❌ Twilio Error: {e}")
        print(f"========================================")
        print(f"📨 SIMULATED SMS TO {clean_phone}:")
        print(f"📄 {message_body}")
        print(f"========================================")
        return False