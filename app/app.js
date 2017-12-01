var app = angular.module('escApp', ['ui.bootstrap', 'ui-notification']);
function search(nameKey, myArray) {
    for (var i = 0; i < myArray.length; i++) {
        if (myArray[i].escName === nameKey) {
            return i;
        }
    }
}
app.controller('HomeController', ['$scope', '$uibModal', '$http', '$interval', 'Notification', function ($scope, $uibModal, $http, $interval, Notification) {
    var $ctrl = this;
    $scope.upgradeStatus = [];
    $scope.currVersion = [];
    $scope.logging = [];
    var getEsc = function () {
        $http.get('http://52.33.95.117:9000/fetch_esc_info').then(function (response) {
            $scope.escInfo = response.data.myCollection;

        }, function (error) {
            console.log(error);
            Notification.error('Error Occurred in Fetching ESC Information');
            $interval.cancel(apiCall);
        });
    };
    var getLogs = function (escId) {
        var v = search(escId, $scope.logging);
        $http.get('http://52.33.95.117:9000/getlog/' + escId).then(function (response) {
            var log_data = response.data;
            $scope.logging[v].logs = log_data;
        }, function (response) {
            $interval.cancel($scope.logging[v].timerObj);
        }, function (response) {
            Notification.error('Error Occurred in getting Logs for ' + escId);
            console.log(response);
        });
    };
    getEsc();
    var apiCall = $interval(function () {
        getEsc();
    }, 15000);
    $scope.upgradeCheck = function (escId) {
        var getVal = search(escId, $scope.upgradeStatus);
        if (typeof(getVal) === "undefined") {
            return false;
        }
        return $scope.upgradeStatus[getVal].status;
    };
    $scope.update = function (escId, currVersion) {
        // var modalInstance = $uibModal.open({
        //     animation: $ctrl.animationsEnabled,
        //     ariaLabelledBy: 'modal-title',
        //     ariaDescribedBy: 'modal-body',
        //     templateUrl: 'upgradeSoftware.html',
        //     controller: 'ModalInstanceCtrl',
        //     controllerAs: '$ctrl',
        //     size: 'md',
        //     resolve: {
        //         escId: function () {
        //             return escId;
        //         },
        //         currVersion: function () {
        //             return currVersion;
        //         },
        //         versions: function () {
        //             return versions;
        //         }
        //     }
        // });
        // modalInstance.result.then(function (selectVersion) {
        //     alert("Selected Version " + selectVersion);
        // }, function () {
        // });
        $http.get('http://52.33.95.117:9000/softwareversion/' + escId).then(function (response) {
            var availVer = response.data;
            if (currVersion === availVer) {
                Notification.warning('No upgrade is available for ' + escId);
            } else {
                var getVal = search(escId, $scope.currVersion);
                if (typeof(getVal) === "undefined") {
                    $scope.currVersion.push({
                        'escName': escId,
                        'currVersion': currVersion,
                        'availVersion': availVer
                    });
                } else {
                    $scope.currVersion[getVal].availVersion = availVer;
                    $scope.currVersion[getVal].currVersion = currVersion;
                }
                if (confirm('Are you sure you want to upgrade ESC ' + escId + ' to ' + availVer + '?')) {
                    var v = search(escId, $scope.upgradeStatus);
                    if (typeof(getVal) === "undefined") {
                        $scope.upgradeStatus.push({'escName': escId, 'status': true});
                    } else {
                        $scope.upgradeStatus[v].status = true;
                    }
                    var v_log = search(escId, $scope.logging);
                    if (typeof(v_log) === "undefined") {
                        $scope.logging.push({
                            'escName': escId, 'logs':'', 'timerObj': $interval(function () {
                                getLogs(escId);
                            }, 5000)
                        });
                    } else {
                        $scope.logging[v_log].logs = '';
                        $scope.logging[v_log].timerObj = $interval(function () {
                            getLogs(escId);
                        }, 5000);
                    }
                    $http.get('http://52.33.95.117:9000/upgrade/' + escId).then(function (response) {
                        if (response.data === 'Upgrade successful') {
                            Notification.success('Upgrade is successful for ' + escId);
                        } else {
                            Notification.error('Upgrade not successful for ' + escId + '<br /><b>' + response.data + '</b>');
                        }
                        var v_log = search(escId, $scope.logging);
                        $interval.cancel($scope.logging[v_log].timerObj);
                        //delete $scope.upgradeStatus[v_log];
                        var v = search(escId, $scope.upgradeStatus);
                        $scope.upgradeStatus[v].status = false;
                        getEsc();
                    }, function (response) {
                        Notification.error('Error Occurred in Upgrading ' + escId);
                        console.log(response);

                    });
                } else {
                    Notification.warning('Upgrade is cancelled for ' + escId);
                    console.log('Upgrade Cancelled');
                }
            }
        }, function (response) {
            Notification.error('Error Occurred in Upgrading ' + escId);
            console.log(response);
        });
    };

    $scope.enableEsc = function (escId) {
        $http.post('http://52.33.95.117:9000/esc_enable/' + escId).then(function (response) {
            Notification.success(escId + ' enabled');
            getEsc();
        }, function (error) {
            Notification.error('Error Occurred in enabling ' + escId);
            console.log(error);
        });
    };
    $scope.disableEsc = function (escId) {
        $http.post('http://52.33.95.117:9000/esc_disable/' + escId).then(function (response) {
            Notification.success(escId + ' disabled');
            getEsc();
        }, function (error) {
            Notification.error('Error Occurred in disabling ' + escId);
            console.log(error);
        });
    }
}]);
// app.controller('ModalInstanceCtrl', function ($uibModalInstance, escId, versions, currVersion, $scope) {
//     var $ctrl = this;
//     $ctrl.escId = escId;
//     $scope.prop = {
//         'value': currVersion,
//         'values': versions
//     };
//     $ctrl.ok = function () {
//         $uibModalInstance.close($scope.prop.value);
//     };
//
//     $ctrl.cancel = function () {
//         $uibModalInstance.dismiss('cancel');
//     };
// });