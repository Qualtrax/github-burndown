(function() {

  angular.module('huburn')
    .config(['$routeProvider',
      function($routeProvider) {
        $routeProvider
         .when('/landing/:repo*', {
            templateUrl: 'templates/landing.html',
            controller: 'landingCtrl'
          })
          .when('/burndown/:repo*', {
            templateUrl: 'templates/burndown.html',
            controller: 'burndownCtrl'
          })
          .when('/burnup/:repo*', {
            templateUrl: 'templates/burnup.html',
            controller: 'burnupCtrl'
          })
          .when('/availability/:repo*', {
            templateUrl: 'templates/availability.html',
            controller: 'availabilityCtrl'
          })
          .when('/repositories', {
            templateUrl: 'templates/repositories.html',
            controller: 'repositoriesCtrl'
          })
          .otherwise({
            redirectTo: '/repositories'
          });
      }
    ]);
}());