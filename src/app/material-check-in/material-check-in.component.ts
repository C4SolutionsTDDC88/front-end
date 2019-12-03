import { Component, OnInit, Inject, ElementRef } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { FormGroup,  FormBuilder,  Validators } from '@angular/forms';
import { SelectionModel, DataSource } from '@angular/cdk/collections';
import { MaterialCheckBoxService } from '../table-article-data/material-check-box.service';
import { StorageRoomStore } from "../storage-room/storage-room-store";
import { StorageRoomService } from "../storage-room/storage-room.service";
import { DataService } from "../data.service"


export interface DialogData {
  material_number: any;
  reference_number: string;
  branch: string;
  storage_room: string;
  shelf: string;
  package: string;
  comment: string;
  placement: any;
}

export interface Room {
  roomName: String;
  roomId: number;
}
export interface Shelf {
  shelfName: String;
  shelfId: number;
}
export interface Area {
  areaName: String;
  areaId: number;
}
export interface Package {
  packageName: String;
  packageId: number;
}
export interface package_shelf{
  shelf: string;

}
export interface packageData{
  
    id: number,
    package_number: string,
    shelf: number,
    case: number,
    current_storage_room: number

}
export interface DialogData{
  selectedMaterials: String[];
  preChosen: boolean;
}


@Component({
  selector: 'app-material-check-in',
  templateUrl: './material-check-in.component.html',
  styleUrls: ['./material-check-in.component.less']
})
export class MaterialCheckInComponent implements OnInit {


  selection : any[];
  materials: String[];
  preChosen = false;

  storage_room: String;
  branch: String;


  constructor(
    private materialCheckBoxService: MaterialCheckBoxService,
    public dialog: MatDialog,
    private storageRoomStore: StorageRoomStore,
    private storageRoomService: StorageRoomService,
    ) { }

  openDialog(): void {

    if((this.materials && this.materials.length > 0)){
      this.preChosen= true;
    } else {
      this.preChosen = false;
      this.materials = [] as String[];
    }

    const dialogRef = this.dialog.open(MaterialCheckInDialogComponent, {
      width: '500px',
      height:'550px',
      

      data:
      {branch: this.branch,
      storage_room: this.storage_room,
      selectedMaterials: this.materials,
      preChosen: this.preChosen
      }
    });

    // runs every time we close the Modal or submit
    dialogRef.afterClosed().subscribe(result => {

      console.log('The dialog was closed');

      if(result != null ){ // if user presses cancel the result is null. TODO: better solution for checking this

       // reset material list
      this.materials = [];
      } else {
        console.log('Empty result');
      }

    });
  }

  ngOnInit() {
    this.storageRoomStore.currentStorageRoom.subscribe(currentRoom => {
      this.storageRoomService
        .getBranchNameForStorageRoom(currentRoom)
        .subscribe(branchName => {
          this.branch = branchName;
          this.storage_room = currentRoom.name;
        });
    });
    this.materialCheckBoxService.checkBoxChange.subscribe(newSelection => {
      this.selection = newSelection.selected;
      this.materials = this.selection.reduce((a, {material_number}) => a.concat(material_number), []);
    });
  }


}
export interface Duplicate {
  material_number: String;
  storage_room: String;
}

@Component({
  selector: 'app-material-check-in-dialog',
  templateUrl: './material-check-in-dialog.component.html',
})
export class MaterialCheckInDialogComponent {
  checkOutConfirmed : boolean = false;

  checkInForm: FormGroup;
  storage_room_id: Number;
  branch_id: Number;
  reference_number: string;
  shelves: Shelf[] = [{"shelfName": "", "shelfId": 0}];
  packages: Package[] = [{"packageName": "", "packageId": 0}];
  materialExists: boolean;
  newData: boolean =true;
  newCase: boolean = false;
  package_id: Number;

  duplicateMaterials: Duplicate[] = [];

  hasDuplicate: boolean = false;

  


  constructor(
    public dialogRef: MatDialogRef<MaterialCheckInDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private dataService: DataService,
    private fb: FormBuilder,
    private storageRoomStore: StorageRoomStore) {
      this.storageRoomStore.currentStorageRoom.subscribe(currentRoom => {
          this.branch_id = currentRoom.branch;
          this.storage_room_id = currentRoom.id;
      });

      //Get the shelves that belong to the current storage room
      this.dataService.sendGetRequest("/shelf/storageroom/" + this.storage_room_id).subscribe((data: any[])=>{
        var tmp_shelves = []
        for (var d of data) {
          var tmp: Shelf = {"shelfName": d.shelf_name,
                            "shelfId": d.id}
          this.shelves.push(tmp);
        }
      })

      //Get the packages that belong to the current room
      this.dataService.sendGetRequest("/package/storageroom/" + this.storage_room_id).subscribe((data: any[])=>{
        var tmp_packages = []
        for (var d of data) {
          var tmp: Package = {"packageName": d.package_number,
                            "packageId": d.id}
          this.packages.push(tmp);
        }
        //this.packages = tmp_packages;
      })

      this.createForm();
    }

  createForm() {
    // create variables and validators for form fields
    this.checkInForm = this.fb.group({
      material_number: [''],
      reference_number: [''], //Should always be pre-filled?
      branch: [{value: '', disabled: true}, Validators.required],
      storage_room: [{value: '', disabled: true}, Validators.required],
      shelf: ['', Validators.required],
      package: [''],
      comment: ['']
    });

  }

  onNoClick(): void {  // The cancel-button runs this function
    this.dialogRef.close();
  }

  onXClick(): void{ // Runs when X is clicked
    this.dialogRef.close();
  }
  // Runs when the back arrow button is clicked
  onBackButton() : void {
    this.dialogRef.close();
  }
  onCheckOut() : void {
    let hasDuplicate = false;
    if (this.newData){
    this.data.selectedMaterials.forEach( (val, key, arr )=> {
      this.dataService.sendGetRequest('/article?material_number=' + val).subscribe( (data: any []) => {
        if(data[0].status === 'checked_in'){
          let temp: Duplicate = {material_number: val, storage_room: data[0].storage_room};
          this.duplicateMaterials.push(temp);
          hasDuplicate = true;

          

        }

        if(hasDuplicate){
          this.hasDuplicate = hasDuplicate;
        } else if (!hasDuplicate && Object.is(arr.length - 1, key)) { // no duplicate
          this.onConfirm();
        }
      
      });
    });
    }else{
      this.onConfirm();
    }
    
  }
  onCancelDuplicate () : void {
    this.duplicateMaterials = [];
    this.hasDuplicate = false;
    
  }


  onConfirm() : void {
    this.checkOutConfirmed = true;

  //TODO: If item(s) does not exist, add case number and do different back-end call


  //For check in of existing items
   for (var mat of this.data.selectedMaterials) {
    
    var article_data ={"material_number": mat,  
                      "description":"",
                      "comment": "",
   }

    var post_data = {"material_number": mat,
                    "storage_room": this.storage_room_id
                    };

      //If comment is added then add it to data for post-request
      if (this.data.comment !== "" && this.data.comment !== undefined) {
        post_data["comment"] = this.data.comment;
        article_data["comment"] =this.data.comment;
        article_data["description"] =this.data.comment;
      }else{
        post_data["comment"] = "";
        article_data["comment"] ="";
        article_data["description"] ="";
      }

      //If package is added then add it to data for post-request
      if (this.data.package !== "" && this.data.package !== undefined) {
        
        article_data["storage_room"]= this.storage_room_id
        
       this.dataService.sendGetRequest("/package/package_number/"+ this.data.package).subscribe((data: packageData)=>{
        this.package_id = data["id"];
        article_data["package"]=this.package_id;
        post_data["package"] = this.package_id; 
         
        if (!this.newData){
          
          this.dataService.sendPostRequest("/article/register", article_data).subscribe((data: any[])=>{
          })
        }else {
          console.log(post_data)
          this.dataService.sendPostRequest("/article/check-in", post_data).subscribe((data: any[])=>{
          })
        }
       })
      } else {
        post_data["shelf"] = this.getShelfId(this.data.shelf)
        article_data["shelf"] = this.getShelfId(this.data.shelf)
        article_data["storage_room"]= this.storage_room_id
        if (!this.newData){
          console.log(typeof article_data["package"])
            console.log(article_data); 
          this.dataService.sendPostRequest("/article/register", article_data).subscribe((data: any[])=>{
          })
        }else {
          console.log(post_data)
          this.dataService.sendPostRequest("/article/check-in", post_data).subscribe((data: any[])=>{
          })
        }
      }
      
    }
    

   }


  addCase(currentMaterial : string) : boolean {
    this.dataService.sendGetRequest("/article/" + currentMaterial).subscribe((data: any[])=>{
      console.log(data);
    })
    //Get case for the chosen material
    //If case is empty, then add case.
    //If the case is same as previous case, then return true.
    return true;
  }

  addMaterial(newMaterial : string) : void {
    
    this.dataService.sendGetRequest("/article?material_number="+newMaterial).subscribe( (data: DialogData)=>{
      if (data[0] != undefined ){
      this.newData = true;
    } else{
      this.newData = false;
    }
    
    this.reference_number=newMaterial.substring(0,6);
    this.dataService.sendGetRequest("/case?reference_number="+this.reference_number).subscribe( (data: any[])=>{
      for (var d of data){
        if (this.reference_number.includes(d.reference_number)){
          this.newCase=false;
          break;
        } else{
          this.newCase = true;
        }
      }
    })
    if (!this.data.selectedMaterials.includes(newMaterial)) { 
      if(newMaterial && newMaterial.length > 0) {
        this.data.selectedMaterials.push(newMaterial);
        this.checkInForm.controls['material_number'].reset()
      }
    } else {
      // duplicate
    }
  })
  console.log(this.data.selectedMaterials)
  }


  getShelfId(chosenShelfName) : number {
    for (var shelf of this.shelves) {
      if (chosenShelfName === shelf.shelfName) {
        return shelf.shelfId;
      }
    }
  }

  getShelfName(chosenShelfId) : String {
    for (var shelf of this.shelves) {
      if (chosenShelfId === shelf.shelfId) {
        return shelf.shelfName;
      }
    }
  }

  getPackageId(chosenPackageName) : number {
    for (var pg of this.packages) {
      if (chosenPackageName=== pg.packageName) {
        return pg.packageId;
      }
    }
  }

  removeMaterial(material : string ) : void {
    this.data.selectedMaterials.forEach((item, index) => {
      if (item === material) this.data.selectedMaterials.splice(index, 1);
    });
    this.reference_number = "";
    this.newCase = false;
    this.newData = true;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async updatePackages() {
    //Sleep needed because focusout-event triggers before data is submitted
    await this.sleep(150);
    var shelf_id = this.getShelfId(this.data.shelf);
    if (shelf_id !== undefined && this.data.shelf !== "") {
      this.dataService.sendGetRequest("/package/shelf/" + shelf_id).subscribe((data: any[])=>{
        var tmp_packages = []
        this.packages = [{"packageName": "", "packageId": 0}]
        for (var d of data) {
          var tmp: Package = {"packageName": d.package_number,
                            "packageId": d.id}
          this.packages.push(tmp);
        }
      })
   }
  }

  async updateShelf() {
    //Sleep needed because focusout-event triggers before data is submitted
    await this.sleep(150);
    var package_id = this.getPackageId(this.data.package);
    if (package_id !== undefined && this.data.package !== "" )  {
      this.dataService.sendGetRequest("/package/" + package_id).subscribe((data: any)=>{
        var package_shelf = data.shelf
        var tmp_shelves = []
        var tmp: Shelf = {"shelfName": this.getShelfName(data.shelf),
                          "shelfId": data.shelf}
        this.shelves = [{"shelfName": "", "shelfId": 0}]
        this.shelves.push(tmp);
      })
    }
  }

}

