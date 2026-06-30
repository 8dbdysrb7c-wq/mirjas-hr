import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

try:
    cred = credentials.Certificate("mirjaswork-firebase-adminsdk-j6x7r-85c8f85f57.json")
    firebase_admin.initialize_app(cred)
except ValueError:
    pass

db = firestore.client()

customers_ref = db.collection('customers')
docs = customers_ref.stream()

customers = []
for doc in docs:
    data = doc.to_dict()
    data['id'] = doc.id
    customers.append(data)

# Sort them by createdAt to preserve order
customers.sort(key=lambda x: x.get('createdAt', ''))

# Assign customerNumber starting from CLI-0001
for i, customer in enumerate(customers):
    if not customer.get('customerNumber'):
        customer_number = f"CLI-{str(i + 1).zfill(4)}"
        doc_ref = db.collection('customers').document(customer['id'])
        doc_ref.update({'customerNumber': customer_number})
        print(f"Updated {customer.get('name', '')} -> {customer_number}")
    else:
        print(f"Customer {customer.get('name', '')} already has {customer.get('customerNumber')}")

print("Done updating customers.")
