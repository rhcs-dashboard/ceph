import { Component, Input } from '@angular/core';
import { BaseModal, FileItem } from 'carbon-components-angular';
import { RgwBucketService } from '../../api/rgw-bucket.service';
import { CdFormGroup } from '../../forms/cd-form-group';

@Component({
  selector: 'cd-drop-file-uploader',
  templateUrl: './drop-file-uploader.component.html',
  styleUrls: ['./drop-file-uploader.component.scss']
})
export class DropFileUploaderComponent extends BaseModal {
  fileUploadForm: CdFormGroup;

  @Input() title: string;
  @Input() description: string;
  @Input() buttonText: string;

	@Input() files = new Set<FileItem>();
  @Input() dropText = 'Click or drag files here to upload';
  @Input() disabled = false;


  constructor(
    private rgwBucketService: RgwBucketService
  ) {
    super();
    this.fileUploadForm = new CdFormGroup({});
  }

  onUpload() {
		this.files.forEach(fileItem => {
			if (!fileItem.uploaded) {
				
        fileItem.state = "upload";

        this.rgwBucketService.uploadObjects('test', fileItem.file).subscribe(() => {
          fileItem.state = "complete";
          fileItem.uploaded = true;
        });
			}
		});
	}
}
