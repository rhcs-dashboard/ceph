import { TestBed } from '@angular/core/testing';

import { SmbService } from './smb.service';

describe('SmbService', () => {
  let service: SmbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SmbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
