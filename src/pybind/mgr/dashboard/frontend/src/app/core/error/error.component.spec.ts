import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SharedModule } from '~/app/shared/shared.module';
import { configureTestBed } from '~/testing/unit-test-helper';
import { ErrorComponent } from './error.component';

describe('ErrorComponent', () => {
  let component: ErrorComponent;
  let fixture: ComponentFixture<ErrorComponent>;

  configureTestBed({
    declarations: [ErrorComponent],
    imports: [SharedModule],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error message and header', () => {
    window.history.pushState({ message: 'Access Forbidden', header: 'User Denied' }, 'Errors');
    component.fetchData();
    fixture.detectChanges();
    const header = fixture.debugElement.nativeElement.querySelector('h3');
    expect(header.innerHTML).toContain('User Denied');
    const message = fixture.debugElement.nativeElement.querySelector('h4');
    expect(message.innerHTML).toContain('Access Forbidden');
  });

  it('should show 404 Page not Found if message and header are blank', () => {
    window.history.pushState({ message: '', header: '' }, 'Errors');
    component.fetchData();
    fixture.detectChanges();
    const header = fixture.debugElement.nativeElement.querySelector('h3');
    expect(header.innerHTML).toContain('Page not Found');
    const message = fixture.debugElement.nativeElement.querySelector('h4');
    expect(message.textContent).toContain("Sorry, we couldn't find what you were looking for.");
  });

  it('should show Go To Overview button when no custom buttons or module', () => {
    window.history.pushState({ message: '', header: '' }, 'Errors');
    component.fetchData();
    fixture.detectChanges();
    const button = fixture.debugElement.nativeElement.querySelector('button[cdsButton]');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Go To Overview');
  });
});
