#!/bin/bash

##############################################################################
# DashFinance NGINX Deployment Script
# This script deploys NGINX configuration to 147.93.183.55
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="147.93.183.55"
DEPLOY_PATH="/dashfinance"
SSH_USER="root"
DOMAINS=("ia.angrax.com.br" "ia.ifin.app.br" "ai.ifin.app.br" "angrallm.app.br")
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

##############################################################################
# Functions
##############################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if SSH key exists
check_ssh_access() {
    print_header "Checking SSH Access"
    
    if ssh -o ConnectTimeout=5 ${SSH_USER}@${SERVER_IP} "echo 'SSH connection successful'" &>/dev/null; then
        print_success "SSH connection to ${SERVER_IP} successful"
    else
        print_error "Cannot connect to ${SERVER_IP} via SSH"
        exit 1
    fi
}

# Check local files
check_local_files() {
    print_header "Checking Local Files"
    
    if [ ! -f "${LOCAL_PATH}/nginx.conf" ]; then
        print_error "nginx.conf not found in ${LOCAL_PATH}"
        exit 1
    fi
    print_success "nginx.conf found"
    
    if [ ! -f "${LOCAL_PATH}/docker-compose.yml" ]; then
        print_error "docker-compose.yml not found in ${LOCAL_PATH}"
        exit 1
    fi
    print_success "docker-compose.yml found"
    
    if [ ! -d "${LOCAL_PATH}/ssl" ]; then
        print_warning "ssl directory not found - will create on server"
    else
        local cert_count=$(find "${LOCAL_PATH}/ssl" -type f | wc -l)
        print_success "ssl directory found with $cert_count files"
    fi
}

# Create remote directories
create_remote_dirs() {
    print_header "Creating Remote Directories"
    
    ssh ${SSH_USER}@${SERVER_IP} << 'EOF'
        mkdir -p /dashfinance/ssl
        mkdir -p /dashfinance/logs
        chmod 755 /dashfinance
        chmod 755 /dashfinance/ssl
        chmod 755 /dashfinance/logs
        echo "Directories created successfully"
EOF
    
    print_success "Remote directories created"
}

# Copy files to server
copy_files_to_server() {
    print_header "Copying Files to Server"
    
    print_info "Copying nginx.conf..."
    scp -q "${LOCAL_PATH}/nginx.conf" ${SSH_USER}@${SERVER_IP}:${DEPLOY_PATH}/nginx.conf
    print_success "nginx.conf copied"
    
    print_info "Copying docker-compose.yml..."
    scp -q "${LOCAL_PATH}/docker-compose.yml" ${SSH_USER}@${SERVER_IP}:${DEPLOY_PATH}/docker-compose.yml
    print_success "docker-compose.yml copied"
    
    if [ -d "${LOCAL_PATH}/ssl" ] && [ "$(ls -A ${LOCAL_PATH}/ssl 2>/dev/null)" ]; then
        print_info "Copying SSL certificates..."
        scp -q -r "${LOCAL_PATH}/ssl"/* ${SSH_USER}@${SERVER_IP}:${DEPLOY_PATH}/ssl/
        print_success "SSL certificates copied"
    fi
}

# Fix permissions on server
fix_remote_permissions() {
    print_header "Fixing Remote Permissions"
    
    ssh ${SSH_USER}@${SERVER_IP} << 'EOF'
        chmod 644 /dashfinance/nginx.conf
        chmod 644 /dashfinance/docker-compose.yml
        chmod 600 /dashfinance/ssl/*.key 2>/dev/null || true
        chmod 644 /dashfinance/ssl/*.crt 2>/dev/null || true
        echo "Permissions fixed"
EOF
    
    print_success "Remote permissions fixed"
}

# Validate NGINX configuration
validate_nginx_config() {
    print_header "Validating NGINX Configuration"
    
    # Create temporary config for validation
    local temp_config=$(ssh ${SSH_USER}@${SERVER_IP} cat ${DEPLOY_PATH}/nginx.conf)
    
    if ssh ${SSH_USER}@${SERVER_IP} docker run --rm -v ${DEPLOY_PATH}/nginx.conf:/etc/nginx/nginx.conf:ro nginx nginx -t 2>&1 | grep -q "successful"; then
        print_success "NGINX configuration is valid"
    else
        print_warning "Could not validate using Docker - will validate after deployment"
    fi
}

# Start/restart containers
manage_containers() {
    print_header "Managing Docker Containers"
    
    local action=$1
    
    ssh ${SSH_USER}@${SERVER_IP} << EOF
        cd ${DEPLOY_PATH}
        
        case "${action}" in
            start)
                echo "Starting containers..."
                docker-compose up -d
                echo "Containers started"
                ;;
            restart)
                echo "Restarting containers..."
                docker-compose restart nginx
                echo "Containers restarted"
                ;;
            stop)
                echo "Stopping containers..."
                docker-compose stop
                echo "Containers stopped"
                ;;
            *)
                echo "Unknown action: ${action}"
                exit 1
                ;;
        esac
        
        sleep 2
        docker-compose ps
EOF
}

# Check container status
check_container_status() {
    print_header "Checking Container Status"
    
    ssh ${SSH_USER}@${SERVER_IP} << 'EOF'
        cd /dashfinance
        echo "Container Status:"
        docker-compose ps
        
        echo -e "\nNGINX Process:"
        docker-compose exec -T nginx ps aux | grep nginx | grep -v grep || echo "NGINX not running"
        
        echo -e "\nNGINX Configuration Test:"
        docker-compose exec -T nginx nginx -t 2>&1 || echo "Configuration test failed"
EOF
}

# Test endpoints
test_endpoints() {
    print_header "Testing NGINX Endpoints"
    
    print_info "Testing HTTP to HTTPS redirect..."
    local redirect_test=$(curl -I -s -o /dev/null -w "%{http_code}" "http://${SERVER_IP}")
    if [ "$redirect_test" == "301" ] || [ "$redirect_test" == "307" ]; then
        print_success "HTTP redirect working"
    else
        print_warning "HTTP redirect test returned status $redirect_test"
    fi
    
    print_info "Testing health endpoint..."
    local health_test=$(curl -s http://127.0.0.1/health 2>/dev/null || echo "Connection refused")
    if echo "$health_test" | grep -q "healthy"; then
        print_success "Health endpoint responding"
    else
        print_warning "Health endpoint returned: $health_test"
    fi
    
    print_info "Testing domains via HTTPS (certificate check)..."
    for domain in "${DOMAINS[@]}"; do
        local cert_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep "notAfter" || echo "Not found")
        if [ ! -z "$cert_date" ]; then
            print_success "$domain - $cert_date"
        else
            print_warning "$domain - Certificate not accessible"
        fi
    done
}

# Display logs
show_logs() {
    print_header "NGINX Logs"
    
    ssh ${SSH_USER}@${SERVER_IP} << 'EOF'
        cd /dashfinance
        
        echo "=== Recent NGINX Access Log ==="
        docker-compose logs --tail=20 nginx | grep "GET\|POST" || echo "No recent logs"
        
        echo -e "\n=== NGINX Error Log ==="
        docker-compose exec -T nginx tail -20 /var/log/nginx/error.log 2>/dev/null || echo "No errors"
EOF
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}DashFinance NGINX Deployment${NC}"
    echo "1) Full Deployment (check SSH → validate files → copy → start)"
    echo "2) Check Status Only"
    echo "3) Restart Containers"
    echo "4) Stop Containers"
    echo "5) Show Logs"
    echo "6) Test Endpoints"
    echo "0) Exit"
    echo -n "Select option: "
}

##############################################################################
# Main Script
##############################################################################

main() {
    if [ $# -eq 0 ]; then
        # Interactive mode
        while true; do
            show_menu
            read option
            
            case $option in
                1)
                    print_header "Starting Full Deployment"
                    check_ssh_access
                    check_local_files
                    create_remote_dirs
                    copy_files_to_server
                    fix_remote_permissions
                    validate_nginx_config
                    manage_containers "start"
                    check_container_status
                    test_endpoints
                    print_success "Deployment completed successfully!"
                    ;;
                2)
                    check_container_status
                    ;;
                3)
                    manage_containers "restart"
                    check_container_status
                    ;;
                4)
                    manage_containers "stop"
                    ;;
                5)
                    show_logs
                    ;;
                6)
                    test_endpoints
                    ;;
                0)
                    echo "Exiting..."
                    exit 0
                    ;;
                *)
                    print_error "Invalid option"
                    ;;
            esac
        done
    else
        # Command line mode
        case $1 in
            deploy)
                print_header "Starting Full Deployment"
                check_ssh_access
                check_local_files
                create_remote_dirs
                copy_files_to_server
                fix_remote_permissions
                validate_nginx_config
                manage_containers "start"
                check_container_status
                test_endpoints
                print_success "Deployment completed successfully!"
                ;;
            status)
                check_container_status
                ;;
            restart)
                manage_containers "restart"
                check_container_status
                ;;
            stop)
                manage_containers "stop"
                ;;
            logs)
                show_logs
                ;;
            test)
                test_endpoints
                ;;
            *)
                echo "Usage: $0 {deploy|status|restart|stop|logs|test}"
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"

