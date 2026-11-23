import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { SharedModule } from '~/app/shared/shared.module';
import { configureTestBed } from '~/testing/unit-test-helper';
import { ErrorComponent } from './error.component';
import { ModuleStatusPromptComponent } from './module-status-prompt/module-status-prompt.component';

describe('ErrorComponent', () => {
  let component: ErrorComponent;
  let fixture: ComponentFixture<ErrorComponent>;

  configureTestBed({
    declarations: [ErrorComponent],
    imports: [
      HttpClientTestingModule,
      RouterTestingModule,
      SharedModule,
      ModuleStatusPromptComponent
    ]
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
    expect(message.innerHTML).toContain('Sorry, we couldn’t find what you were looking for.');
  });
});
