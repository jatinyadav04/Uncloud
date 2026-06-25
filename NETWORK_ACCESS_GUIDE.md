# Network Access Configuration Guide

## Current Status
✅ **Frontend**: Accessible on `http://0.0.0.0:3000` (all network interfaces)
✅ **Backend**: Accessible on `http://0.0.0.0:8000` (all network interfaces)
✅ **API URL**: Configured to use `192.168.1.4:8000`

## Access Methods

### 1. Local Network Access (Same WiFi/LAN)
- **Frontend**: `http://192.168.1.4:3000`
- **Backend API**: `http://192.168.1.4:8000`
- **API Documentation**: `http://192.168.1.4:8000/docs`

### 2. External Internet Access

#### Step 1: Configure Router Port Forwarding
1. Access your router admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Navigate to Port Forwarding / Virtual Server settings
3. Add these port forwarding rules:
   - **Port 3000** → **192.168.1.4:3000** (Frontend)
   - **Port 8000** → **192.168.1.4:8000** (Backend)

#### Step 2: Update API Configuration
Create a `.env.local` file in the frontend directory:
```bash
# For external access
NEXT_PUBLIC_API_URL=http://223.233.64.133:8000
```

#### Step 3: Access URLs
- **Frontend**: `http://223.233.64.133:3000`
- **Backend API**: `http://223.233.64.133:8000`

## Security Considerations

### For Production Deployment:
1. **Use HTTPS**: Configure SSL certificates
2. **Authentication**: Implement proper user authentication
3. **Rate Limiting**: Add API rate limiting
4. **Firewall**: Configure proper firewall rules
5. **Environment Variables**: Use secure environment variable management

### For Development:
- Current configuration is suitable for development and testing
- Ensure your firewall allows connections on ports 3000 and 8000

## Testing Network Access

### From Another Device on Same Network:
```bash
# Test frontend
curl http://192.168.1.4:3000

# Test backend
curl http://192.168.1.4:8000/docs
```

### From External Network:
```bash
# Test frontend
curl http://223.233.64.133:3000

# Test backend
curl http://223.233.64.133:8000/docs
```

## Troubleshooting

1. **Connection Refused**: Check if ports are open in firewall
2. **Timeout**: Verify port forwarding configuration
3. **CORS Issues**: Backend is already configured for CORS
4. **API Not Found**: Ensure API_URL environment variable is set correctly

## Current Machine Details
- **Local IP**: 192.168.1.4
- **Public IP**: 223.233.64.133
- **Frontend Port**: 3000
- **Backend Port**: 8000
