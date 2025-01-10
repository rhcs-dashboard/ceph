import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { DomainSettings, SMBJoinAuth, SMBCluster, SMBUsersGroups, RequestModel } from '~/app/ceph/smb/smb.model';

@Injectable({
  providedIn: 'root'
})
export class SmbService {
  baseURL = 'api/smb';
  private modalDataSubject = new Subject<DomainSettings>();
  modalData$ = this.modalDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  passData(data: DomainSettings) {
    this.modalDataSubject.next(data);
  }

  listClusters(): Observable<SMBCluster[]> {
    return this.http.get<SMBCluster[]>(`${this.baseURL}/cluster`);
  }

  createCluster(requestModel: RequestModel) {
    return this.http.post(`${this.baseURL}/cluster`, requestModel);
  }

  removeCluster(clusterId: string) {
    return this.http.delete(`${this.baseURL}/cluster/${clusterId}`, {
      observe: 'response'
    });
  }

  listJoinAuths(): Observable<SMBJoinAuth[]> {
    return this.http.get<SMBJoinAuth[]>(`${this.baseURL}/joinauth`);
  }

  listUsersGroups(): Observable<SMBUsersGroups[]> {
    return this.http.get<SMBUsersGroups[]>(`${this.baseURL}/usersgroups`);
  }

  getJoinAuth(authId: string): Observable<SMBJoinAuth> {
    return this.http.get<SMBJoinAuth>(`${this.baseURL}/joinauth?auth_id=${authId}`);
  }

  getUsersGroups(usersGroupsId: string): Observable<SMBUsersGroups> {
    return this.http.get<SMBUsersGroups>(`${this.baseURL}/usersgroups?users_groups_id=${usersGroupsId}`);
  }

  createJoinAuth(joinAuth: SMBJoinAuth) {
    return this.http.post(`${this.baseURL}/joinauth`, {
      join_auth: joinAuth
    })
  }

  createUsersgroups(usersgroups: SMBUsersGroups) {
    return this.http.post(`${this.baseURL}/usersgroups`, {
      usersgroups: usersgroups
    })
  }

  deleteJoinAuth(authId: string) {
    return this.http.delete(`${this.baseURL}/joinauth/${authId}`, {
      observe: 'response'
    });
  }

  deleteUsersgroups(usersGroupsId: string) {
    return this.http.delete(`${this.baseURL}/usersgroups/${usersGroupsId}`, {
      observe: 'response'
    });
  }
}
