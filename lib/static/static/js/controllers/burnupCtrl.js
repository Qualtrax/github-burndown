(function () {
    angular
        .module('huburn')
        .controller('burnupCtrl', burnupCtrl);

    burnupCtrl.$inject = ['$routeParams', '$scope', 'burnupCalculator', 'velocityMetrics', 'gitHubService', 'availabilityService'];

    function burnupCtrl($routeParams, $scope, burnupCalculator, velocityMetrics, gitHubService, availabilityService) {
        $scope.milestonesDisplayed = 20;
        $scope.milestonesInVelocity = 6;
        $scope.milestones = [];
        $scope.loading = true;

        function getMetadata(milestone) {
            var matches = milestone.description.match(/@huburn: {.*}/);

            if (!matches)
                return {
                    met: false
                };

            var firstMatch = matches[0];
            return JSON.parse(firstMatch.substring(8));
        }

        gitHubService.get({
                path: '/repos/' + $routeParams.repo + '/milestones',
                state: 'closed',
                sort: 'due_date',
                direction: 'desc',
                per_page: $scope.milestonesDisplayed
            })
            .then(getPastMilestoneData)
            .then(getCurrentMilestoneData);

        function getPastMilestoneData(milestones) {
            var promise = getVelocity(milestones[0]);

            milestones.forEach(function (milestone) {
                if (milestone != milestones[0]) {
                    promise = promise.then(function() {
                        return getVelocity(milestone);
                    });
                }
            });

            return promise;
        }

        function getVelocity(milestone) {
            return gitHubService.get({
                    path: '/repos/' + $routeParams.repo + '/issues',
                    milestone: milestone.number,
                    state: 'all',
                    per_page: 100
                })
                .then(function success(issues) {
                    getPastMilestoneDataFrom(issues, milestone);
                });
        }

        function getPastMilestoneDataFrom(issues, milestone) {
            milestone.metadata = getMetadata(milestone);
            milestone.metadata.categories = burnupCalculator.getCategoryData(issues);
            milestone.metadata.totalPointsWorkedOn = burnupCalculator.getTotalPoints(issues);
            
            milestone.metadata.freeranges = burnupCalculator.getNumberOfLabel(issues, /freerange/);
            milestone.metadata.firelanes = burnupCalculator.getNumberOfLabel(issues, /firelane/);
            milestone.metadata.escalations = burnupCalculator.getNumberOfLabel(issues, /escalation/);
            milestone.metadata.scopeChanges = burnupCalculator.getNumberOfLabel(issues, /scope change/);
            milestone.metadata.zeroDefects = burnupCalculator.getNumberOfLabel(issues, /zero-defect/);
            milestone.metadata.nearMisses = burnupCalculator.getNumberOfLabel(issues, /near-miss/);

            var milestones = $scope.milestones.slice(0);
            milestones.push(milestone);
            milestones.sort(function (a, b) {
                return new Date(a.due_on).getTime() - new Date(b.due_on).getTime();
            });
            $scope.milestones = milestones;
            $scope.closedIterationData = velocityMetrics.getMetrics(milestones);
        }

        function getCurrentMilestoneData() {
            gitHubService.get({
                    path: '/repos/' + $routeParams.repo + '/milestones',
                    state: 'open',
                    sort: 'due_date',
                    direction: 'asc'
                })
                .then(function success(milestones) {
                    gitHubService.get({
                            path: '/repos/' + $routeParams.repo + '/issues',
                            milestone: milestones[0].number,
                            state: 'all',
                            per_page: 100
                        })
                        .then(function success(issues) {
                            milestones[0].metadata = getMetadata(milestones[0]);
                            milestones[0].metadata.zeroDefectBacklog = burnupCalculator.getNumberOfLabelOpen(issues, /zero-defect/);
                            milestones[0].metadata.nearMissBacklog = burnupCalculator.getNumberOfLabelOpen(issues, /near-miss/);

                            var startIndex = $scope.milestonesDisplayed - $scope.milestonesInVelocity;
                            var velocityMilestones = $scope.milestones.slice(startIndex, $scope.milestones.length);
                            $scope.burnup = burnupCalculator.getBurnup(velocityMilestones, milestones[0], issues);
                            $scope.openIterationData = velocityMetrics.getCurrentSprintMetrics(milestones[0]);
                        })
                        .then(finishLoading);
                });
        }

        function finishLoading() {
            $scope.loading = false;
        }
    };
}());