# Remote Apache Log Setup Guide

Follow these steps on your **Remote Linux Server** to start shipping logs to your local machine.

## Prerequisites
1.  **Connectivity**: The remote server must be able to ping your local machine's IP address (e.g., via VPN, ZeroTier, or Public IP).
2.  **Apache**: Apache (httpd/apache2) should be running and generating logs.

## Step 1: Install Filebeat (Remote Server)

**For Debian/Ubuntu:**
```bash
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.11.1-amd64.deb
sudo dpkg -i filebeat-8.11.1-amd64.deb
```

**For RHEL/CentOS:**
```bash
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.11.1-x86_64.rpm
sudo rpm -vi filebeat-8.11.1-x86_64.rpm
```

## Step 2: Configure Filebeat

1.  **Copy the Config**:
    Copy the content of `remote_filebeat.yml` (from this project) to `/etc/filebeat/filebeat.yml` on the remote server.
    ```bash
    sudo nano /etc/filebeat/filebeat.yml
    # Paste the content here
    ```

2.  **Edit IP Address**:
    Find `YOUR_LOCAL_IP` in the file and replace it with your Windows machine's IP address (e.g., `192.168.1.5` or `10.x.x.x`).
    
    *Typically found by running `ipconfig` on Windows.*

3.  **Enable Apache Module**:
    ```bash
    sudo filebeat modules enable apache
    ```

## Step 3: Start Shipping

1.  **Setup Dashboards** (Run this once):
    ```bash
    sudo filebeat setup
    ```
    *If this fails, ensure your Windows firewall allows traffic on ports 9200 (ES) and 5601 (Kibana).*

2.  **Start Service**:
    ```bash
    sudo systemctl enable filebeat
    sudo systemctl start filebeat
    ```

## Step 4: Verify in Kibana

1.  Go to **Kibana** on your local machine: http://localhost:5601
2.  Navigate to **Analytics > Discover**.
3.  Select the `filebeat-*` index pattern.
4.  You should see logs coming in!
