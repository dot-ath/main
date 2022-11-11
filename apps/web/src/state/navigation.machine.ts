import { ActorManager, ActorType, getActorId } from '@explorers-club/actor';
import { matchPath, NavigateFunction } from 'react-router-dom';
import { ActorRefFrom, ContextFrom, DoneInvokeEvent, StateFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';
import { createClubScreenMachine } from '../routes/club/club-screen.machine';
import { createHomeScreenMachine } from '../routes/home/home-screen.machine';
import { AuthActor } from './auth.machine';

const navigationModel = createModel({}, { events: { FOO: () => ({} as any) } }); // Fixes TS lol
export type NavigationContext = ContextFrom<typeof navigationModel>;

interface CreateNavigationMachineProps {
  initial: string;
  navigate: NavigateFunction;
  authActor: AuthActor;
}

export const createNavigationMachine = ({
  initial,
  navigate,
  authActor,
}: CreateNavigationMachineProps) => {
  return navigationModel.createMachine(
    {
      id: 'NavigationMachine',
      initial,
      states: {
        Home: {
          invoke: {
            id: 'homeScreenMachine',
            src: () => createHomeScreenMachine({ authActor }),
            onDone: [
              {
                target: 'Club',
                actions: 'navigateToClubScreen',
              },
            ],
          },
        },
        Club: {
          invoke: {
            id: 'clubScreenMachine',
            src: (_) => {
              const pathMatch = matchPath(
                '/:playerName',
                window.location.pathname
              );
              const playerName = pathMatch?.params.playerName;
              if (!playerName) {
                throw new Error(
                  'expected playerName from path but was undefined'
                );
              }
              const actorId = getActorId(ActorType.PARTY_ACTOR, playerName);
              const actorManager = new ActorManager(actorId);

              return createClubScreenMachine({
                hostPlayerName: playerName,
                authActor,
                actorManager,
              });
            },
          },
        },
      },
      predictableActionArguments: true, // from xstate v4 warning
    },
    {
      actions: {
        navigateToClubScreen: (context, event: DoneInvokeEvent<string>) => {
          const playerName = event.data;
          if (!playerName) {
            throw new Error('expected club screen');
          }
          navigate(`/${playerName}`, { replace: true });
        },
      },
    }
  );
};

export type NavigationMachine = ReturnType<typeof createNavigationMachine>;
export type NavigationActor = ActorRefFrom<NavigationMachine>;
export type NavigationState = StateFrom<NavigationMachine>;
