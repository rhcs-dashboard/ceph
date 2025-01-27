import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { Node } from 'carbon-components-angular/treeview/tree-node.types';
import { RgwBucketService } from '~/app/shared/api/rgw-bucket.service';
import { DropFileUploaderComponent } from '~/app/shared/components/drop-file-uploader/drop-file-uploader.component';
import { CellTemplate } from '~/app/shared/enum/cell-template.enum';
import { CdTableAction } from '~/app/shared/models/cd-table-action';
import { CdTableColumn } from '~/app/shared/models/cd-table-column';
import { CdTableSelection } from '~/app/shared/models/cd-table-selection';
import { Permission } from '~/app/shared/models/permissions';
import { DimlessPipe } from '~/app/shared/pipes/dimless.pipe';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { ModalCdsService } from '~/app/shared/services/modal-cds.service';

@Component({
  selector: 'cd-rgw-object-list',
  templateUrl: './rgw-object-list.component.html',
  styleUrls: ['./rgw-object-list.component.scss']
})
export class RgwObjectListComponent implements OnInit{

  @Input()
  bucket: string;

  data: any;
  columns: CdTableColumn[] = [];
  tableActions: CdTableAction[] = [];
  selection: CdTableSelection = new CdTableSelection();
  nodes: Node[] = [];
  metadata: any;
  metadataTitle: string;
  metadataKeyMap: { [key: number]: any } = {};

  permission: Permission;

  constructor(
    private rgwBucketService: RgwBucketService,
    private authStorageService: AuthStorageService,
    private modalCdsService: ModalCdsService,
    private dimlessBinaryPipe: DimlessPipe,
    private cdRef: ChangeDetectorRef
  ) {
    this.permission = this.authStorageService.getPermissions().rgw;
  }

  ngOnInit() {
    this.tableActions = [
      {
        permission: 'create',
        icon: 'fa-upload',
        name: $localize`Upload`,
        click: () => this.openModal()
      },
      {
        permission: 'delete',
        icon: 'fa-trash-o',
        disable: () => !this.data || this.data.length === 0,
        name: $localize`Delete`
      }
    ]
    this.columns = [
      {
        name: $localize`Name`,
        prop: 'Key'
      },
      {
        name: $localize`Size`,
        prop: 'Size',
        pipe: this.dimlessBinaryPipe
      },
      {
        name: $localize`Storage Class`,
        prop: 'StorageClass'
      },
      {
        name: $localize`Last Modified`,
        prop: 'LastModified',
        cellTransformation: CellTemplate.timeAgo
        
      }
    ]
    this.rgwBucketService.listObjects(this.bucket, '', '/').subscribe((data) => {
      this.data = data[0].Contents;
      this.nodes = data[0].Contents.map((content: any) => {
        console.log(content);
        return {
          label: content.Key,
          id: content.Key,
          value: content,
          name: content.Key,
        };
      });
      const commonPrefixNodes = data[0].CommonPrefixes.map((prefix: any) => {
        console.log(prefix);
        return {
          label: prefix, // The folder name
          id: prefix, // Unique identifier
          value: '', // No value for the folder itself
          name: prefix,
          children: [prefix]
        };
      });
      this.nodes = [...commonPrefixNodes, ...this.nodes];
      console.log(this.nodes)
    });
  }

  updateSelection(selection: CdTableSelection) {
    this.selection = selection;
  }

  openModal() {
    this.modalCdsService.show(DropFileUploaderComponent)
  }
  nodeToggle(event: any) {
    this.rgwBucketService.listObjects(this.bucket, event.id).subscribe((data) => {
      // Find the current node and toggle its expanded state
      const node = this.nodes.find((n) => n.id === event.id);
      if (!node) {
        console.error('Node not found');
        return;
      }
      
      // Toggle the expanded state
      node.expanded = !node.expanded;
  
      // Rebuild the node structure with the updated children
      const commonPrefixNodes = data[0].CommonPrefixes.map((prefix: any) => {
        return {
          label: prefix, // Folder name
          id: prefix, // Unique identifier
          value: '', // No value for the folder itself
          name: prefix,
          children: [prefix]  // Folders can have children later
        };
      });
  
      const contentNodes = data[0].Contents.map((content: any) => {
        return {
          label: content.Key,
          id: content.Key,
          value: content,
          name: content.Key
        };
      });
  
      const updatedChildren = [...commonPrefixNodes, ...contentNodes];
  
      // Update the node with new children
      node.children = updatedChildren;
  
      // Rebuild the nodes array entirely to force change detection
      this.nodes = [...this.nodes];
      
      // Manually trigger change detection to update the view
      this.cdRef.detectChanges();
      this.cdRef.markForCheck();
  
      console.log(this.nodes);
    });
  }
  onNodeSelected(node: Node) {
    if (node.id !== undefined) {
      this.metadata = node.value;
      this.metadataTitle = node.name;
    } else {
      delete this.metadata;
      delete this.metadataTitle;
    }
  }
  
}
