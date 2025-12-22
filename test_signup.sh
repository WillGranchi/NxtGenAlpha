#!/bin/bash
# Test signup endpoint

echo "🧪 Testing signup endpoint..."
echo ""

response=$(curl -s -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456","name":"Test User"}')

echo "Response:"
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

# Check if it's a 404
if echo "$response" | grep -q "Endpoint not found"; then
    echo "❌ 404 Error - Routes not registered"
    echo "   Make sure the backend server is running with the latest code"
elif echo "$response" | grep -q "password_hash"; then
    echo "❌ Database Error - password_hash column missing"
    echo "   Run: cd backend && python3 migrations/add_password_hash.py"
elif echo "$response" | grep -q "User created successfully"; then
    echo "✅ Signup successful!"
else
    echo "Response received (may be an error, check above)"
fi

