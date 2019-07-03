import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'cd-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.scss']
})
export class ErrorComponent implements OnInit {
  errorHeading: string;
  errordesc: string;
  path: string;
  returnTo: string;
  constructor(private router: Router) {}

  ngOnInit() {
    this.path = this.router.url;
    if (this.path === '/404') {
      this.errorHeading = 'Page Not Found';
      this.errordesc = `Sorry, we couldn’t find what you were looking for.
      The page you requested may have been changed or moved.`;
      this.returnTo = 'Dashboard';
    } else if (this.path === '/403') {
      this.errorHeading = 'Access Denied';
      this.errordesc = `Sorry, you don’t have permission to view this page
      or resource.`;
      this.returnTo = 'Dashboard';
    } else if (this.path === '/sso/404') {
      this.errorHeading = 'User Denied';
      this.errordesc = `Sorry, the user does not exist in Ceph.
      You'll be logged out from the Identity Provider when you retry logging in.`;
      this.returnTo = 'Login Page';
    }
  }

  dashboard() {
    if (this.path === '/sso/404') {
      this.router.navigateByUrl(`${window.location.origin}/auth/saml2/slo`);
    } else {
      this.router.navigateByUrl('/dashboard');
    }
  }
}
