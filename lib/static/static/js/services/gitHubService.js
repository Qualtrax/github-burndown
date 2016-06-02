(function() {
'use strict'

  angular
    .module('huburn')
    .factory('gitHubService', gitHubService);

    gitHubService.$inject = ['$http', '$q']

    function gitHubService($http, $q) {
      return {
        get: get,
        patch: patch
      };

    function get (params) {
      var deferred = $q.defer();

      $http.get('/github', { params: params } ).success(function(data) {
          deferred.resolve(data);
      });

      return deferred.promise;
    }
    
    function patch (params) {
      var deferred = $q.defer();
      
      $http.get('/github-patch', { params: params } )
        .success(function (data) {
          deferred.resolve(data);
        });
        
      return deferred.promise;
    }
  }
}()); 

