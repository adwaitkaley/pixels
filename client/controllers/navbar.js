angular.module('MyApp')
  .controller('NavbarCtrl', function($scope, $auth) {
    $scope.isAuthenticated = function() {
    	alert("test");
      return $auth.isAuthenticated();
    };
  });