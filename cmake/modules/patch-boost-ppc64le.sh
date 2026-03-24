#!/bin/sh
# -*- mode:sh; tab-width:4; indent-tabs-mode:nil -*

set -ex

PROJECT_SRC_DIR="$1"

patch -N "${PROJECT_SRC_DIR}/libs/context/src/asm/ontop_ppc64_sysv_elf_gas.S" << EOL
--- boost/src/Boost/libs/context/src/asm/ontop_ppc64_sysv_elf_gas.S	2026-02-16 11:41:13.018280785 -0600
+++ ontop_ppc64_sysv_elf_gas.S.new	2026-02-17 02:53:03.082288351 -0600
@@ -98,7 +98,7 @@
 # endif
 #endif
     # reserve space on stack
-    subi  %r1, %r1, 184
+    subi  %r1, %r1, 200
 
 #if _CALL_ELF != 2
     std  %r2,  0(%r1)  # save TOC
@@ -134,6 +134,10 @@
     # save LR as PC
     std   %r0, 176(%r1)
 
+    # save VS63
+    li %r31, 184
+    stvx %v31, %r1, %r31
+
     # store RSP (pointing to context-data) in R7
     mr  %r7, %r1
 
@@ -145,6 +149,10 @@
     mr  %r1, %r4
 #endif
 
+    # restore VS63
+    li %r31, 184
+    lvx %v31, %r1, %r31
+    
     ld  %r14, 8(%r1)  # restore R14
     ld  %r15, 16(%r1)  # restore R15
     ld  %r16, 24(%r1)  # restore R16
@@ -204,7 +212,7 @@
     mtlr  %r0
 
     # adjust stack
-    addi  %r1, %r1, 184
+    addi  %r1, %r1, 200
 
     # jump to context
     bctr
EOL

patch -N "${PROJECT_SRC_DIR}/libs/context/src/asm/jump_ppc64_sysv_elf_gas.S" << EOL
--- boost/src/Boost/libs/context/src/asm/jump_ppc64_sysv_elf_gas.S	2026-02-16 11:30:18.324795292 -0600
+++ jump_ppc64_sysv_elf_gas.S.new	2026-02-17 02:55:32.496233167 -0600
@@ -98,7 +98,7 @@
 # endif
 #endif
     # reserve space on stack
-    subi  %r1, %r1, 184
+    subi  %r1, %r1, 200

 #if _CALL_ELF != 2
     std  %r2,  0(%r1)  # save TOC
@@ -134,6 +134,10 @@
     # save LR as PC
     std   %r0, 176(%r1)

+    # Save VS63
+    li    %r31, 184
+    stvx  %v31, %r1, %r31
+
     # store RSP (pointing to context-data) in R6
     mr  %r6, %r1

@@ -146,6 +150,11 @@

     ld  %r2,  0(%r1)  # restore TOC
 #endif
+
+    # Restore VS63
+    li    %r31, 184
+    lvx   %v31, %r1, %r31
+
     ld  %r14, 8(%r1)  # restore R14
     ld  %r15, 16(%r1)  # restore R15
     ld  %r16, 24(%r1)  # restore R16
@@ -181,7 +190,7 @@
     mtctr  %r12

     # adjust stack
-    addi  %r1, %r1, 184
+    addi  %r1, %r1, 200

 #if _CALL_ELF == 2
     # copy transfer_t into transfer_fn arg registers
EOL
