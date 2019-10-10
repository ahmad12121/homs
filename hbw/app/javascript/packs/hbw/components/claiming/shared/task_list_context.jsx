import React, { Component, createContext } from 'react';
import PropTypes from 'prop-types';
import { debounce } from 'lodash-es';
import { withClaimingTasks } from '../../helpers';

export const TaskListContext = createContext({});
export const TaskListConsumer = TaskListContext.Consumer;

const withTaskListContext = (WrappedComponent) => {
  class TaskListProvider extends Component {
    static propTypes = {
      subscription:       PropTypes.object.isRequired,
      updateSubscription: PropTypes.func.isRequired,
      perPage:            PropTypes.number.isRequired,
      syncing:            PropTypes.bool.isRequired,
    };

    tabs = {
      my:         0,
      unassigned: 1,
    };

    stateForReset = {
      tasks:       [],
      query:       '',
      searchQuery: '',
      page:        1,
      lastPage:    false,
    };

    state = {
      ...this.stateForReset,
      myTasksCount:         0, // should be filled by separate subscription
      unassignedTasksCount: 0, // and passed to tabs component
      tab:                  this.tabs.my,
    };

    componentDidMount () {
      const { subscription, perPage } = this.props;

      subscription.progress(({ tasks }) => this.setState(prevState => ({
        tasks,
        lastPage: tasks.length < prevState.page * perPage
      })));
    }

    updateSubscription = () => {
      const { page, searchQuery, tab } = this.state;

      this.props.updateSubscription({
        assigned: tab === this.tabs.my,
        page,
        searchQuery,
      });
    };

    updateContext = (...state) => {
      this.setState(...state, this.updateSubscription);
    };

    resetContext = () => {
      this.setState(this.stateForReset, this.updateSubscription);
    };

    search = debounce(this.updateSubscription, 350);

    onSearch = ({ target }) => {
      const query = target.value.trim();

      this.setState({
        searchQuery: query.length > 2 ? query : '',
        query,
      }, this.search);
    };

    addPage = () => {
      this.setState(
        prevState => ({ page: prevState.page + 1 }),
        this.updateSubscription
      );
    };

    switchTabTo = (tab) => {
      if (tab !== this.state.tab) {
        this.setState(
          { ...this.stateForReset, tab },
          this.updateSubscription
        );
      }
    };

    render () {
      const contextValue = {
        ...this.state,
        fetching:    this.props.syncing,
        update:      this.updateContext,
        reset:       this.resetContext,
        onSearch:    this.onSearch,
        addPage:     this.addPage,
        switchTabTo: this.switchTabTo,
      };

      return (
        <TaskListContext.Provider value={contextValue}>
          <WrappedComponent {...this.props} />
        </TaskListContext.Provider>
      );
    }
  }

  return withClaimingTasks(TaskListProvider);
};

export default withTaskListContext;
