"""
Seed script to populate realistic multilingual customer feedback and run analysis.
"""
import uuid
from datetime import datetime, timedelta, timezone
from app.database.session import SessionLocal
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.models.workspace import Workspace
from app.models.user import User
from app.models.user_workspace import UserWorkspace
from app.models.competitor import Competitor
from app.models.alert import Alert
from app.models.analysis_result import AnalysisResult
from app.services.analysis import analyze_feedback
from app.services.search import build_dataset_index
from app.services.competitor import analyze_dataset_competitors

SAMPLE_FEEDBACK = [
    # Positive Hinglish & English
    ("Delivery bahut fast thi aur packaging bhi awesome thi! 5 stars to the delivery partner.", 5.0, "Mobile App", "hi-Latn"),
    ("Great experience overall. The customer service team resolved my issue within 10 minutes.", 5.0, "Zendesk", "en"),
    ("Product quality ekdum first class hai. Best purchase of this month.", 5.0, "Play Store", "hi-Latn"),
    ("App interface is super clean and smooth. Bahut easy hai use karna.", 4.5, "App Store", "hi-Latn"),
    ("Received fresh groceries well within 15 minutes. Very reliable service!", 5.0, "Website", "en"),
    ("Refund quickly process ho gaya, support team was very helpful and polite.", 5.0, "Email", "hi-Latn"),
    ("Amazing deals and discounts! Pricing is much better than Swiggy or Zomato.", 4.5, "Play Store", "en"),
    ("UI responsive hai aur search functionality instant results deti hai.", 4.0, "Play Store", "hi-Latn"),
    
    # Negative Hinglish & English (Complaints)
    ("Payment deduct ho gaya account se lekin order confirm nahi hua! Fraud app hai refund do immediately.", 1.0, "Twitter", "hi-Latn"),
    ("Delivery boy was 45 minutes late and the food was completely cold and ruined.", 1.0, "Mobile App", "en"),
    ("Customer care number kabhi connect nahi hota. Worst support ever!", 1.0, "Zendesk", "hi-Latn"),
    ("App crashes every time I try to add items to cart on iOS 18. Fix this bug ASAP!", 1.5, "App Store", "en"),
    ("Khana thanda tha aur parcel khula hua tha. Delivery agent ka behaviour rude tha.", 1.0, "Mobile App", "hi-Latn"),
    ("Return request reject kar diya without any valid reason. Terrible return policy.", 1.5, "Email", "en"),
    ("High delivery fee and surge pricing at normal hours. Prices are getting ridiculous.", 2.0, "Play Store", "en"),
    ("Paise kat gaye par wallet balance update nahi hua. Still waiting for reply since 3 days.", 1.0, "Zendesk", "hi-Latn"),

    # Neutral / Mixed
    ("Delivery on time thi par packaging thodi average thi. Overall okay experience.", 3.0, "Mobile App", "hi-Latn"),
    ("Good selection of products, but prices are slightly higher than local supermarket.", 3.0, "Website", "en"),
    ("App features acche hain lekin navigation thoda confusing lagta hai new users ke liye.", 3.0, "Play Store", "hi-Latn"),
    ("Order delivered safely. Could improve delivery tracking accuracy on the map.", 3.5, "Mobile App", "en"),
    ("Pehle delivery free thi, ab minimum order value increase kar diya hai.", 2.5, "Play Store", "hi-Latn"),
    ("Customer support is responsive but resolution time can be improved.", 3.0, "Email", "en"),

    # Pure Hindi (Devanagari)
    ("उत्कृष्ट सेवा और समय पर डिलीवरी। मैं इस ऐप से बहुत संतुष्ट हूँ।", 5.0, "Play Store", "hi"),
    ("पैसा कट गया लेकिन ऑर्डर नहीं मिला। तुरंत रिफंड करें।", 1.0, "Twitter", "hi"),
    ("सपोर्ट टीम ने बहुत जल्दी समस्या हल कर दी। धन्यवाद!", 4.5, "Website", "hi"),
    ("सामान खराब निकला और कोई रिफंड नहीं मिल रहा। बहुत घटिया सेवा।", 1.0, "Play Store", "hi"),
]

def seed_all():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("No users found. Creating a default demo user...")
            from app.core.security import get_password_hash
            default_user = User(
                email="admin@example.com",
                name="Admin User",
                hashed_password=get_password_hash("password123"),
                is_active=True,
            )
            db.add(default_user)
            db.commit()
            db.refresh(default_user)
            
            from app.services.workspace import create_workspace
            create_workspace(db, user_id=default_user.id, name="Demo Workspace")
            users = [default_user]

        for user in users:
            memberships = db.query(UserWorkspace).filter_by(user_id=user.id).all()
            for m in memberships:
                ws_id = m.workspace_id
                ws = db.query(Workspace).filter_by(id=ws_id).first()
                if not ws:
                    continue
                print(f"Seeding for User {user.email} in Workspace '{ws.name}' ({ws_id})...")

                # Ensure at least one dataset exists
                dataset = db.query(Dataset).filter_by(workspace_id=ws_id).first()
                if not dataset:
                    dataset = Dataset(
                        workspace_id=ws_id,
                        name="Customer Feedback Q3",
                        description="Multilingual feedback across e-commerce, delivery, and support channels",
                        source="multi-channel",
                        status="completed",
                        original_filename="sample_feedback.csv",
                        row_count=0,
                        created_by=user.id
                    )
                    db.add(dataset)
                    db.commit()
                    db.refresh(dataset)

                # Check existing feedback count
                existing_fb_count = db.query(Feedback).filter_by(dataset_id=dataset.id).count()
                if existing_fb_count < 10:
                    print(f"Adding sample feedback records to dataset '{dataset.name}'...")
                    now = datetime.now(timezone.utc)
                    added_feedbacks = []
                    for i, (text, rating, source, lang) in enumerate(SAMPLE_FEEDBACK):
                        fb_time = now - timedelta(days=(25 - i) % 18, hours=(i * 3) % 24)
                        fb = Feedback(
                            workspace_id=ws_id,
                            dataset_id=dataset.id,
                            original_text=text,
                            rating=rating,
                            source=source,
                            feedback_timestamp=fb_time,
                            language=lang,
                            processing_status="pending",
                        )
                        db.add(fb)
                        added_feedbacks.append(fb)
                    
                    db.commit()
                    for fb in added_feedbacks:
                        db.refresh(fb)

                    # Update dataset row count
                    dataset.row_count = len(added_feedbacks)
                    dataset.status = "completed"
                    db.commit()

                # Ensure all feedback records are analyzed
                pending_fb = db.query(Feedback).filter_by(dataset_id=dataset.id).all()
                print(f"Analyzing {len(pending_fb)} feedback records for dataset '{dataset.name}'...")
                for fb in pending_fb:
                    existing_res = db.query(AnalysisResult).filter_by(feedback_id=fb.id).first()
                    if not existing_res:
                        try:
                            analyze_feedback(db, feedback_id=fb.id, user_id=user.id)
                        except Exception as e:
                            print(f"Error analyzing feedback {fb.id}: {e}")

                # Ensure Competitors exist for comparison
                comp_names = ["Swiggy", "Zomato", "Blinkit"]
                for c_name in comp_names:
                    exists = db.query(Competitor).filter_by(workspace_id=ws_id, name=c_name).first()
                    if not exists:
                        comp = Competitor(
                            workspace_id=ws_id,
                            name=c_name,
                            aliases=[c_name.lower()],
                            description=f"{c_name} delivery and ordering benchmark",
                            active=True
                        )
                        db.add(comp)
                db.commit()

                # Scan competitor mentions
                try:
                    analyze_dataset_competitors(db, dataset_id=dataset.id, user_id=user.id)
                except Exception as e:
                    print(f"Competitor scan notice: {e}")

                # Build FAISS vector index
                try:
                    print(f"Building FAISS vector index for dataset '{dataset.name}'...")
                    build_dataset_index(db, dataset_id=dataset.id, user_id=user.id)
                except Exception as e:
                    print(f"FAISS index notice: {e}")

                # Ensure Alert rules exist
                alert_exists = db.query(Alert).filter_by(workspace_id=ws_id).first()
                if not alert_exists:
                    rule1 = Alert(
                        workspace_id=ws_id,
                        name="High Negative Sentiment Spike",
                        metric="negative_sentiment_rate",
                        operator="gt",
                        threshold=0.30,
                        enabled=True
                    )
                    rule2 = Alert(
                        workspace_id=ws_id,
                        name="Payment Failure Complaint Alert",
                        metric="complaint_count",
                        operator="gte",
                        threshold=3.0,
                        enabled=True
                    )
                    db.add_all([rule1, rule2])
                    db.commit()

        print("Seeding completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_all()
