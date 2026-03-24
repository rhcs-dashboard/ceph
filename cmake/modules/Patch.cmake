# Generic file where package specific patches
# can be applied.

# Apply ppc64le specific patches
if(CMAKE_SYSTEM_PROCESSOR MATCHES ppc64le)
  include(${CMAKE_MODULE_PATH}/PatchPPC64LE.cmake)
  # Apply boost specific patches
  if(PACKAGE_NAME MATCHES boost)
    patch_boost_ppc64le(${VERSION} ${SOURCE_DIR})
  endif()
endif()
