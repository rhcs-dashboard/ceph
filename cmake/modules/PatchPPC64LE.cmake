# Patch boost-1.87.0 for ppc64le to pick the vector 
# register fixes from boost-1.88.0
# See more: https://tracker.ceph.com/issues/74914
function(patch_boost_ppc64le version source_dir)
  if(version VERSION_EQUAL 1.87)
    find_program(PATCH_PROG patch)
    if(PATCH_PROG)
      execute_process(
        COMMAND ${CMAKE_MODULE_PATH}/patch-boost-ppc64le.sh ${source_dir}
        RESULT_VARIABLE patch_boost_ppc64le_result
      )
      if(patch_boost_ppc64le_result EQUAL 0)
        message(STATUS "Successfully patched vector register fixes in boost")
      else()
        message(FATAL_ERROR "Failed to apply patch for ppc64le")
      endif()
    endif()
  endif()
endfunction()
