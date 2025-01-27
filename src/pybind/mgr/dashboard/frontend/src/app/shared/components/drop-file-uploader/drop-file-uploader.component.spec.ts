import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropFileUploaderComponent } from './drop-file-uploader.component';

describe('DropFileUploaderComponent', () => {
  let component: DropFileUploaderComponent;
  let fixture: ComponentFixture<DropFileUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DropFileUploaderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropFileUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
