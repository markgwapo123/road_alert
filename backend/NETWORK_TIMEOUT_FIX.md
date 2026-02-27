# MongoDB Network Timeout Fix

## 🔴 Problem Identified

```
MongoNetworkTimeoutError: connection 3 to 159.143.162.120:27017 timed out
```

**Root Cause:** Your computer cannot reach the MongoDB Atlas shard server at IP `159.143.162.120:27017`

---

## ✅ What I Fixed

### 1. **Reduced Database Load**
- Disabled verbose authentication logging (was querying database 20+ times per request)
- This reduces connection pool exhaustion

### 2. **Better Error Handling**
- Added specific error messages for timeout errors
- Added retry hints for the frontend

---

## 🔧 How to Fix the Network Timeout

### **Option 1: Check Windows Firewall** (Most Likely)

1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find "Node.js" and ensure both Private and Public are checked
4. Or temporarily disable firewall to test:
   ```powershell
   # Run as Administrator
   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
   ```

### **Option 2: Check Antivirus**

Your antivirus might be blocking MongoDB connections:
- Temporarily disable antivirus
- Add exception for Node.js and MongoDB connections

### **Option 3: Try Mobile Hotspot**

Test if it's your network/ISP:
1. Connect to mobile hotspot
2. Try accessing the site again
3. If it works, your ISP or network is blocking MongoDB

### **Option 4: Use MongoDB Atlas Connection String (SRV)**

The current connection uses direct IPs. Switch to SRV format for better routing:

**Current:**
```
mongodb://markstephenmagbatos:***@ac-hazu7ht-shard-00-00.mx6qk3q.mongodb.net:27017,...
```

**Better (SRV):**
```
mongodb+srv://markstephenmagbatos:your_password@ac-hazu7ht.mx6qk3q.mongodb.net/roadalert?retryWrites=true&w=majority
```

### **Option 5: Check MongoDB Atlas**

1. Go to https://cloud.mongodb.com/
2. Check if cluster is running (not paused)
3. Verify Network Access has `0.0.0.0/0` (allows all IPs)
4. Check cluster health status

---

## 🚀 Quick Test

Run this in PowerShell to test connectivity to MongoDB:

```powershell
Test-NetConnection -ComputerName 159.143.162.120 -Port 27017
```

**Expected:** `TcpTestSucceeded : True`  
**If False:** Your network is blocking the connection

---

## 📝 Apply SRV Connection String

Update your `.env` file:

```env
# OLD (Direct IP)
MONGODB_URI=mongodb://markstephenmagbatos:your_password@ac-hazu7ht-shard-00-00.mx6qk3q.mongodb.net:27017,ac-hazu7ht-shard-00-01.mx6qk3q.mongodb.net:27017,ac-hazu7ht-shard-00-02.mx6qk3q.mongodb.net:27017/roadalert?ssl=true&authSource=admin&retryWrites=true&w=majority

# NEW (SRV - Better routing)
MONGODB_URI=mongodb+srv://markstephenmagbatos:your_password@ac-hazu7ht.mx6qk3q.mongodb.net/roadalert?retryWrites=true&w=majority
```

Then restart the backend server.

---

## ⚡ Why Database Health Check Works But API Doesn't

The health check script:
- Uses a fresh connection
- Single query
- No middleware overhead

The API route:
- Uses connection pool
- Multiple concurrent requests (20+ auth checks)
- Pool gets exhausted when one shard times out

---

## 🎯 Recommended Fix Order

1. **First:** Update to SRV connection string (easiest)
2. **Second:** Check Windows Firewall
3. **Third:** Try mobile hotspot to isolate network issue
4. **Fourth:** Check MongoDB Atlas cluster status

---

## 📊 Connection Pool Settings (Already Optimized)

Your database config is already optimized:
- ✅ maxPoolSize: 10
- ✅ minPoolSize: 5
- ✅ socketTimeoutMS: 75000
- ✅ serverSelectionTimeoutMS: 30000

---

## 🔍 Monitor Backend Logs

Watch the PowerShell window for these messages:
- ✅ `MongoDB Connected` = Good
- ❌ `MongoNetworkTimeoutError` = Network issue
- ❌ `ENOTFOUND` = DNS issue
- ❌ `ECONNREFUSED` = Firewall/port blocked

---

**Next Steps:** Try Option 1 (Check Firewall) first, then Option 4 (SRV connection string)
