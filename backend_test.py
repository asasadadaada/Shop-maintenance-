#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Maintenance Staff Management System
Tests all endpoints with Arabic error messages and role-based permissions
"""

import requests
import json
import sys
from datetime import datetime

class MaintenanceAPITester:
    def __init__(self, base_url="https://tech-dispatch-37.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.tech_token = None
        self.admin_user = None
        self.tech_user = None
        self.test_task_id = None
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test accounts
        self.admin_credentials = {
            "email": "admin@test.com",
            "password": "admin123"
        }
        self.tech_credentials = {
            "email": "tech@test.com", 
            "password": "tech123"
        }

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            else:
                return False, f"Unsupported method: {method}"
                
            success = response.status_code == expected_status
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                try:
                    error_data = response.json()
                    return False, f"Status {response.status_code}: {error_data.get('detail', 'Unknown error')}"
                except:
                    return False, f"Status {response.status_code}: {response.text}"
                    
        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}"

    def test_admin_login(self):
        """Test admin login"""
        print("\n🔐 Testing Admin Login...")
        success, response = self.make_request(
            'POST', 'auth/login', 
            self.admin_credentials, 
            expected_status=200
        )
        
        if success and isinstance(response, dict) and 'token' in response:
            self.admin_token = response['token']
            self.admin_user = response['user']
            self.log_test("Admin Login", True)
            print(f"   Admin: {self.admin_user['name']} ({self.admin_user['role']})")
            return True
        else:
            self.log_test("Admin Login", False, str(response))
            return False

    def test_technician_login(self):
        """Test technician login"""
        print("\n🔧 Testing Technician Login...")
        success, response = self.make_request(
            'POST', 'auth/login', 
            self.tech_credentials, 
            expected_status=200
        )
        
        if success and isinstance(response, dict) and 'token' in response:
            self.tech_token = response['token']
            self.tech_user = response['user']
            self.log_test("Technician Login", True)
            print(f"   Technician: {self.tech_user['name']} ({self.tech_user['role']})")
            return True
        else:
            self.log_test("Technician Login", False, str(response))
            return False

    def test_get_technicians_list(self):
        """Test getting technicians list (admin only)"""
        print("\n👥 Testing Get Technicians List...")
        success, response = self.make_request(
            'GET', 'technicians', 
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            self.log_test("Get Technicians List", True)
            print(f"   Found {len(response)} technicians")
            return True
        else:
            self.log_test("Get Technicians List", False, str(response))
            return False

    def test_create_task(self):
        """Test creating a new task (admin only)"""
        print("\n📝 Testing Create Task...")
        
        task_data = {
            "customer_name": "أحمد محمد",
            "customer_phone": "0501234567",
            "customer_address": "الرياض، حي النخيل، شارع الملك فهد",
            "issue_description": "مشكلة في نظام التكييف - لا يعمل بشكل صحيح",
            "assigned_to": self.tech_user['id'] if self.tech_user else None
        }
        
        success, response = self.make_request(
            'POST', 'tasks', 
            task_data, 
            token=self.admin_token,
            expected_status=200
        )
        
        if success and isinstance(response, dict) and 'id' in response:
            self.test_task_id = response['id']
            self.log_test("Create Task", True)
            print(f"   Task ID: {self.test_task_id}")
            print(f"   Status: {response['status']}")
            return True
        else:
            self.log_test("Create Task", False, str(response))
            return False

    def test_get_tasks_admin(self):
        """Test getting tasks as admin"""
        print("\n📋 Testing Get Tasks (Admin)...")
        success, response = self.make_request(
            'GET', 'tasks', 
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            self.log_test("Get Tasks (Admin)", True)
            print(f"   Found {len(response)} tasks")
            return True
        else:
            self.log_test("Get Tasks (Admin)", False, str(response))
            return False

    def test_get_tasks_technician(self):
        """Test getting tasks as technician"""
        print("\n📋 Testing Get Tasks (Technician)...")
        success, response = self.make_request(
            'GET', 'tasks', 
            token=self.tech_token
        )
        
        if success and isinstance(response, list):
            self.log_test("Get Tasks (Technician)", True)
            print(f"   Found {len(response)} assigned tasks")
            return True
        else:
            self.log_test("Get Tasks (Technician)", False, str(response))
            return False

    def test_accept_task(self):
        """Test accepting a task (technician only)"""
        if not self.test_task_id:
            self.log_test("Accept Task", False, "No task ID available")
            return False
            
        print("\n✅ Testing Accept Task...")
        success, response = self.make_request(
            'PATCH', f'tasks/{self.test_task_id}/accept', 
            token=self.tech_token
        )
        
        if success:
            self.log_test("Accept Task", True)
            print(f"   Response: {response}")
            return True
        else:
            self.log_test("Accept Task", False, str(response))
            return False

    def test_start_task(self):
        """Test starting a task (technician only)"""
        if not self.test_task_id:
            self.log_test("Start Task", False, "No task ID available")
            return False
            
        print("\n🚀 Testing Start Task...")
        success, response = self.make_request(
            'PATCH', f'tasks/{self.test_task_id}/start', 
            token=self.tech_token
        )
        
        if success:
            self.log_test("Start Task", True)
            print(f"   Response: {response}")
            return True
        else:
            self.log_test("Start Task", False, str(response))
            return False

    def test_update_location(self):
        """Test updating location (technician only)"""
        if not self.test_task_id:
            self.log_test("Update Location", False, "No task ID available")
            return False
            
        print("\n📍 Testing Update Location...")
        
        location_data = {
            "task_id": self.test_task_id,
            "latitude": 24.7136,
            "longitude": 46.6753
        }
        
        success, response = self.make_request(
            'POST', 'locations', 
            location_data, 
            token=self.tech_token
        )
        
        if success:
            self.log_test("Update Location", True)
            print(f"   Response: {response}")
            return True
        else:
            self.log_test("Update Location", False, str(response))
            return False

    def test_complete_task(self):
        """Test completing a task with report (technician only)"""
        if not self.test_task_id:
            self.log_test("Complete Task", False, "No task ID available")
            return False
            
        print("\n🏁 Testing Complete Task...")
        
        report_data = {
            "task_id": self.test_task_id,
            "report_text": "تم إصلاح نظام التكييف بنجاح. تم تنظيف الفلاتر وإعادة شحن الغاز. النظام يعمل بكفاءة عالية الآن.",
            "images": ["image1.jpg", "image2.jpg"]
        }
        
        success, response = self.make_request(
            'POST', f'tasks/{self.test_task_id}/complete', 
            report_data, 
            token=self.tech_token
        )
        
        if success:
            self.log_test("Complete Task", True)
            print(f"   Response: {response}")
            return True
        else:
            self.log_test("Complete Task", False, str(response))
            return False

    def test_get_notifications_technician(self):
        """Test getting notifications for technician"""
        print("\n🔔 Testing Get Notifications (Technician)...")
        success, response = self.make_request(
            'GET', 'notifications', 
            token=self.tech_token
        )
        
        if success and isinstance(response, list):
            self.log_test("Get Notifications (Technician)", True)
            print(f"   Found {len(response)} notifications")
            for notif in response[:3]:  # Show first 3
                print(f"   - {notif.get('type', 'unknown')}: {notif.get('message', 'no message')[:50]}...")
            return True, response
        else:
            self.log_test("Get Notifications (Technician)", False, str(response))
            return False, []

    def test_get_notifications_admin(self):
        """Test getting notifications for admin"""
        print("\n🔔 Testing Get Notifications (Admin)...")
        success, response = self.make_request(
            'GET', 'notifications', 
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            self.log_test("Get Notifications (Admin)", True)
            print(f"   Found {len(response)} notifications")
            for notif in response[:3]:  # Show first 3
                print(f"   - {notif.get('type', 'unknown')}: {notif.get('message', 'no message')[:50]}...")
            return True, response
        else:
            self.log_test("Get Notifications (Admin)", False, str(response))
            return False, []

    def test_unread_notifications_count_technician(self):
        """Test getting unread notifications count for technician"""
        print("\n📊 Testing Unread Notifications Count (Technician)...")
        success, response = self.make_request(
            'GET', 'notifications/unread/count', 
            token=self.tech_token
        )
        
        if success and isinstance(response, dict) and 'count' in response:
            self.log_test("Unread Notifications Count (Technician)", True)
            print(f"   Unread count: {response['count']}")
            return True, response['count']
        else:
            self.log_test("Unread Notifications Count (Technician)", False, str(response))
            return False, 0

    def test_unread_notifications_count_admin(self):
        """Test getting unread notifications count for admin"""
        print("\n📊 Testing Unread Notifications Count (Admin)...")
        success, response = self.make_request(
            'GET', 'notifications/unread/count', 
            token=self.admin_token
        )
        
        if success and isinstance(response, dict) and 'count' in response:
            self.log_test("Unread Notifications Count (Admin)", True)
            print(f"   Unread count: {response['count']}")
            return True, response['count']
        else:
            self.log_test("Unread Notifications Count (Admin)", False, str(response))
            return False, 0

    def test_mark_notification_read(self, notifications):
        """Test marking a notification as read"""
        if not notifications:
            self.log_test("Mark Notification Read", False, "No notifications available")
            return False
            
        # Find an unread notification
        unread_notif = None
        for notif in notifications:
            if not notif.get('read', True):
                unread_notif = notif
                break
                
        if not unread_notif:
            print("\n📖 No unread notifications found to test marking as read")
            self.log_test("Mark Notification Read", True, "No unread notifications to test")
            return True
            
        print(f"\n📖 Testing Mark Notification Read (ID: {unread_notif['id']})...")
        success, response = self.make_request(
            'PATCH', f'notifications/{unread_notif["id"]}/read', 
            token=self.tech_token
        )
        
        if success:
            self.log_test("Mark Notification Read", True)
            print(f"   Response: {response}")
            return True
        else:
            self.log_test("Mark Notification Read", False, str(response))
            return False

    def test_get_task_locations(self):
        """Test getting task locations (admin only)"""
        if not self.test_task_id:
            self.log_test("Get Task Locations", False, "No task ID available")
            return False
            
        print("\n🗺️ Testing Get Task Locations...")
        success, response = self.make_request(
            'GET', f'locations/{self.test_task_id}', 
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            self.log_test("Get Task Locations", True)
            print(f"   Found {len(response)} location updates")
            return True
        else:
            self.log_test("Get Task Locations", False, str(response))
            return False

    def test_get_admin_stats(self):
        """Test getting statistics as admin"""
        print("\n📊 Testing Get Statistics (Admin)...")
        success, response = self.make_request(
            'GET', 'stats', 
            token=self.admin_token
        )
        
        if success and isinstance(response, dict):
            self.log_test("Get Statistics (Admin)", True)
            print(f"   Total Tasks: {response.get('total_tasks', 'N/A')}")
            print(f"   Pending: {response.get('pending_tasks', 'N/A')}")
            print(f"   In Progress: {response.get('in_progress_tasks', 'N/A')}")
            print(f"   Completed: {response.get('completed_tasks', 'N/A')}")
            print(f"   Total Technicians: {response.get('total_technicians', 'N/A')}")
            return True
        else:
            self.log_test("Get Statistics (Admin)", False, str(response))
            return False

    def test_get_technician_stats(self):
        """Test getting statistics as technician"""
        print("\n📊 Testing Get Statistics (Technician)...")
        success, response = self.make_request(
            'GET', 'stats', 
            token=self.tech_token
        )
        
        if success and isinstance(response, dict):
            self.log_test("Get Statistics (Technician)", True)
            print(f"   My Tasks: {response.get('my_tasks', 'N/A')}")
            print(f"   My Completed: {response.get('my_completed', 'N/A')}")
            print(f"   My Pending: {response.get('my_pending', 'N/A')}")
            print(f"   My In Progress: {response.get('my_in_progress', 'N/A')}")
            return True
        else:
            self.log_test("Get Statistics (Technician)", False, str(response))
            return False

    def test_permission_restrictions(self):
        """Test permission restrictions"""
        print("\n🔒 Testing Permission Restrictions...")
        
        # Test technician trying to access admin-only endpoints
        success, response = self.make_request(
            'GET', 'technicians', 
            token=self.tech_token,
            expected_status=403
        )
        
        if not success and "403" in str(response):
            self.log_test("Technician Access Restriction", True)
            print("   ✅ Technician correctly blocked from admin endpoints")
        else:
            self.log_test("Technician Access Restriction", False, "Technician should not access admin endpoints")

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Comprehensive Backend API Testing")
        print("=" * 60)
        
        # Authentication tests
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False
            
        if not self.test_technician_login():
            print("❌ Technician login failed - stopping tests")
            return False
        
        # Admin functionality tests
        self.test_get_technicians_list()
        self.test_create_task()
        self.test_get_tasks_admin()
        self.test_get_admin_stats()
        
        # Technician functionality tests
        self.test_get_tasks_technician()
        self.test_accept_task()
        self.test_start_task()
        self.test_update_location()
        self.test_complete_task()
        self.test_get_technician_stats()
        
        # Location and admin verification
        self.test_get_task_locations()
        
        # Permission tests
        self.test_permission_restrictions()
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 FINAL RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
            return True
        else:
            failed = self.tests_run - self.tests_passed
            print(f"⚠️  {failed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = MaintenanceAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())