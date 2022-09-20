"""
Helper methods to test that MON and MDS caps are enforced properly.
"""
from os.path import join as os_path_join

from tasks.cephfs.cephfs_test_case import CephFSTestCase

from teuthology.orchestra.run import Raw

class CapsHelper(CephFSTestCase):

    def write_test_files(self, mounts, testpath=''):
        """
        Exercising 'r' and 'w' access levels on a file on CephFS mount is
        pretty routine across all tests for caps. Adding to method to write
        that file will reduce clutter in these tests.

        This methods writes a fixed data in a file with a fixed name located
        at a fixed path for given list of mounts.
        """
        filepaths, filedata = [], 'testdata'
        dirname, filename = 'testdir', 'testfile'
        # XXX: The reason behind testpath[1:] below is that the testpath is
        # supposed to contain a path inside CephFS (which might be passed as
        # an absolute path). os.path.join() deletes all previous path
        # components when it encounters a path component starting with '/'.
        # Deleting the first '/' from the string in testpath ensures that
        # previous path components are not deleted by os.path.join().
        if testpath:
            testpath = testpath[1:] if testpath[0] == '/' else testpath
        # XXX: passing just '/' screw up os.path.join() ahead.
        if testpath == '/':
            testpath = ''

        for mount_x in mounts:
            dirpath = os_path_join(mount_x.hostfs_mntpt, testpath, dirname)
            mount_x.run_shell(f'mkdir {dirpath}')
            filepath = os_path_join(dirpath, filename)
            mount_x.write_file(filepath, filedata)
            filepaths.append(filepath)

        return filepaths, (filedata,), mounts

    def run_cap_tests(self, filepaths, filedata, mounts, perm, mntpt=None):
        # TODO
        #self.run_mon_cap_tests()
        self.run_mds_cap_tests(filepaths, filedata, mounts, perm, mntpt=mntpt)

    def run_mon_cap_tests(self, moncap, keyring):
        keyring_path = self.fs.admin_remote.mktemp(data=keyring)

        fsls = self.run_cluster_cmd(f'fs ls --id {self.client_id} -k '
                                    f'{keyring_path}')

        if 'fsname=' not in moncap:
            fsls_admin = self.run_cluster_cmd('fs ls')
            self.assertEqual(fsls, fsls_admin)
            return

        fss = (self.fs1.name, self.fs2.name) if hasattr(self, 'fs1') else \
            (self.fs.name,)
        for fsname in fss:
                if fsname in moncap:
                    self.assertIn('name: ' + fsname, fsls)
                else:
                    self.assertNotIn('name: ' + fsname, fsls)

    def run_mds_cap_tests(self, filepaths, filedata, mounts, perm, mntpt=None):
        # XXX: mntpt is path inside cephfs that serves as root for current
        # mount. Therefore, this path must me deleted from filepaths.
        # Example -
        #   orignal path: /mnt/cephfs_x/dir1/dir2/testdir
        #   cephfs dir serving as root for current mnt: /dir1/dir2
        #   therefore, final path: /mnt/cephfs_x//testdir
        if mntpt:
            filepaths = [x.replace(mntpt, '') for x in filepaths]

        self.conduct_pos_test_for_read_caps(filepaths, filedata, mounts)

        if perm == 'rw':
            self.conduct_pos_test_for_write_caps(filepaths, mounts)
        elif perm == 'r':
            self.conduct_neg_test_for_write_caps(filepaths, mounts)
        else:
            raise RuntimeError(f'perm = {perm}\nIt should be "r" or "rw".')

    def conduct_pos_test_for_read_caps(self, filepaths, filedata, mounts):
        for mount in mounts:
            for path, data in zip(filepaths, filedata):
                # XXX: conduct tests only if path belongs to current mount; in
                # teuth tests client are located on same machines.
                if path.find(mount.hostfs_mntpt) != -1:
                    contents = mount.read_file(path)
                    self.assertEqual(data, contents)

    def conduct_pos_test_for_write_caps(self, filepaths, mounts):
        filedata = ('some new data on first fs', 'some new data on second fs')

        for mount in mounts:
            for path, data in zip(filepaths, filedata):
                if path.find(mount.hostfs_mntpt) != -1:
                    # test that write was successful
                    mount.write_file(path=path, data=data)
                    # verify that contents written was same as the one that was
                    # intended
                    contents1 = mount.read_file(path=path)
                    self.assertEqual(data, contents1)

    def conduct_neg_test_for_write_caps(self, filepaths, mounts):
        possible_errmsgs = ('permission denied', 'operation not permitted')
        cmdargs = ['echo', 'some random data', Raw('|'), 'tee']

        for mount in mounts:
            for path in filepaths:
                if path.find(mount.hostfs_mntpt) != -1:
                    cmdargs.append(path)
                    mount.negtestcmd(args=cmdargs, retval=1,
                                     errmsgs=possible_errmsgs)
                    cmdargs.pop(-1)

    def get_mon_cap_from_keyring(self, client_name):
        keyring = self.run_cluster_cmd(cmd=f'auth get {client_name}')
        for line in keyring.split('\n'):
            if 'caps mon' in line:
                return line[line.find(' = "') + 4 : -1]

        raise RuntimeError('get_save_mon_cap: mon cap not found in keyring. '
                           'keyring -\n' + keyring)
