import {useCallback} from 'react';
import {
  useNavigationStore,
  ScreenName,
  NavigationParams,
} from '../stores/navigationStore';

export const useNavigation = () => {
  const navigate = useNavigationStore((state) => state.navigate);
  const goBack = useNavigationStore((state) => state.goBack);
  const replace = useNavigationStore((state) => state.replace);
  const reset = useNavigationStore((state) => state.reset);
  const openModal = useNavigationStore((state) => state.openModal);
  const closeModal = useNavigationStore((state) => state.closeModal);
  const getCurrentScreen = useNavigationStore((state) => state.getCurrentScreen);
  const getCurrentParams = useNavigationStore((state) => state.getCurrentParams);
  const currentScreen = useNavigationStore((state) => {
    const stack = state.stack;
    return stack[stack.length - 1]?.screen || 'home';
  });
  const currentParams = useNavigationStore((state) => {
    const stack = state.stack;
    return stack[stack.length - 1]?.params;
  });

  const navigateTo = useCallback(
    (screen: ScreenName, params?: NavigationParams) => {
      navigate(screen, params);
    },
    [navigate],
  );

  const navigateBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const navigateReplace = useCallback(
    (screen: ScreenName, params?: NavigationParams) => {
      replace(screen, params);
    },
    [replace],
  );

  const navigateReset = useCallback(() => {
    reset();
  }, [reset]);

  const showModal = useCallback(
    (screen: ScreenName, params?: NavigationParams) => {
      openModal(screen, params);
    },
    [openModal],
  );

  const hideModal = useCallback(() => {
    closeModal();
  }, [closeModal]);

  return {
    navigate: navigateTo,
    goBack: navigateBack,
    replace: navigateReplace,
    reset: navigateReset,
    openModal: showModal,
    closeModal: hideModal,
    currentScreen,
    currentParams,
    getCurrentScreen,
    getCurrentParams,
  };
};


















