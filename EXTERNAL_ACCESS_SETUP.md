# 🌐 External Access Setup Guide

## ✅ **What's Already Done:**
- ✅ Frontend configured to bind to all interfaces (`0.0.0.0:3000`)
- ✅ Backend configured to bind to all interfaces (`0.0.0.0:8000`)
- ✅ `.env.local` file created with external API URL
- ✅ Frontend restarted with new configuration

## 🔧 **Step 1: Configure Router Port Forwarding**

### **Find Your Router's IP Address:**
```bash
# Check your router's IP
ip route | grep default
# or
netstat -rn | grep default
```

### **Access Router Admin Panel:**
1. **Open web browser** and go to your router's IP (usually `192.168.1.1` or `192.168.0.1`)
2. **Login** with admin credentials (check router label)
3. **Navigate to Port Forwarding** (may be called "Virtual Server", "Port Mapping", or "NAT")

### **Add Port Forwarding Rules:**

#### **Rule 1: Frontend (Port 3000)**
- **Service Name:** Cleanslate Frontend
- **External Port:** 3000
- **Internal IP:** 192.168.1.4
- **Internal Port:** 3000
- **Protocol:** TCP
- **Status:** Enabled

#### **Rule 2: Backend (Port 8000)**
- **Service Name:** Cleanslate Backend
- **External Port:** 8000
- **Internal IP:** 192.168.1.4
- **Internal Port:** 8000
- **Protocol:** TCP
- **Status:** Enabled

## 🔧 **Step 2: Verify Configuration**

### **Test Local Network Access:**
```bash
# Test frontend
curl http://192.168.1.4:3000

# Test backend
curl http://192.168.1.4:8000/docs
```

### **Test External Access (after port forwarding):**
```bash
# Test frontend
curl http://223.233.64.133:3000

# Test backend
curl http://223.233.64.133:8000/docs
```

## 🌐 **Access URLs**

### **From Same Network:**
- **Frontend:** `http://192.168.1.4:3000`
- **Backend:** `http://192.168.1.4:8000`
- **API Docs:** `http://192.168.1.4:8000/docs`

### **From External Networks (Internet):**
- **Frontend:** `http://223.233.64.133:3000`
- **Backend:** `http://223.233.64.133:8000`
- **API Docs:** `http://223.233.64.133:8000/docs`

## 🔧 **Step 3: Firewall Configuration**

### **Check if ports are open:**
```bash
# Check if ports are listening
netstat -tulpn | grep :3000
netstat -tulpn | grep :8000

# Check firewall status
sudo ufw status
```

### **Open ports if needed:**
```bash
# For Ubuntu/Debian
sudo ufw allow 3000
sudo ufw allow 8000

# For macOS
sudo pfctl -f /etc/pf.conf
```

## 🔧 **Step 4: Router-Specific Instructions**

### **Common Router Brands:**

#### **Netgear:**
1. Go to `192.168.1.1` or `192.168.0.1`
2. Login → Advanced → Port Forwarding
3. Add custom service

#### **Linksys:**
1. Go to `192.168.1.1`
2. Login → Smart Wi-Fi Tools → Port Forwarding
3. Add port forwarding rules

#### **TP-Link:**
1. Go to `192.168.1.1` or `192.168.0.1`
2. Login → Advanced → NAT Forwarding → Port Forwarding
3. Add new rules

#### **ASUS:**
1. Go to `192.168.1.1`
2. Login → Advanced Settings → WAN → Virtual Server
3. Add port forwarding rules

## 🔧 **Step 5: Test External Access**

### **From Another Device:**
1. **Connect to different network** (mobile hotspot, friend's WiFi)
2. **Open browser** and go to `http://223.233.64.133:3000`
3. **Should see** the Cleanslate application

### **From Internet:**
1. **Use online port checker** (e.g., `canyouseeme.org`)
2. **Check ports 3000 and 8000**
3. **Should show as open**

## 🚨 **Troubleshooting**

### **Port Forwarding Not Working:**
1. **Check router settings** - ensure rules are enabled
2. **Verify internal IP** - make sure it's `192.168.1.4`
3. **Check firewall** - ensure ports are open
4. **Restart router** - sometimes needed for changes to take effect

### **External Access Fails:**
1. **Check public IP** - it might have changed
2. **Update .env.local** with new IP if needed
3. **Verify port forwarding** is working
4. **Check ISP restrictions** - some ISPs block certain ports

### **API Not Working:**
1. **Check .env.local** file exists and has correct URL
2. **Restart frontend** after changing environment variables
3. **Verify backend** is running and accessible

## 📱 **Mobile Access**

### **From Mobile Device:**
1. **Connect to different WiFi** or use mobile data
2. **Open browser** and go to `http://223.233.64.133:3000`
3. **Should work** just like on desktop

## 🔒 **Security Considerations**

### **For Production:**
1. **Use HTTPS** - configure SSL certificates
2. **Add authentication** - implement proper user auth
3. **Rate limiting** - prevent abuse
4. **Firewall rules** - restrict access if needed
5. **Regular updates** - keep system secure

### **For Development:**
- Current setup is suitable for testing
- Monitor access logs
- Consider using VPN for additional security

## 📊 **Current Status**

- ✅ **Local Access:** Working (`http://192.168.1.4:3000`)
- ✅ **Network Access:** Working (`http://192.168.1.4:3000`)
- ⏳ **External Access:** Pending router configuration
- ✅ **API Configuration:** Ready (`http://223.233.64.133:8000`)

## 🎯 **Next Steps**

1. **Configure router port forwarding** (follow Step 1)
2. **Test external access** (follow Step 5)
3. **Share the URL** with others: `http://223.233.64.133:3000`
4. **Monitor usage** and adjust as needed

---

**Your application is ready for external access once you configure the router port forwarding!** 🚀
