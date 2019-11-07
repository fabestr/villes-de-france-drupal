<?php


namespace Drupal\weather\Plugin\Block;


use Drupal;
use Drupal\Core\Access\AccessResult;
use Drupal\Core\Annotation\Translation;
use Drupal\Core\Block\Annotation\Block;
use Drupal\Core\Block\BlockBase;
use Drupal\Core\Block\BlockPluginInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Session\AccountInterface;

/**
 * Provides a 'weather' Block.
 *
 * @Block(
 *   id = "weather_block",
 *   admin_label = @Translation("Weather"),
 * )
 */
class WeatherBlock extends BlockBase implements BlockPluginInterface
{

  /**
   * Builds and returns the renderable array for this block plugin.
   *
   * If a block should not be rendered because it has no content, then this
   * method must also ensure to return no content: it must then only return an
   * empty array, or an empty array with #cache set (with cacheability metadata
   * indicating the circumstances for it being empty).
   *
   * @return array
   *   A renderable array representing the content of the block.
   *
   * @see \Drupal\block\BlockViewBuilder
   */


  /**
   * {@inheritdoc}
   */
  protected function blockAccess(AccountInterface $account) {
    return AccessResult::allowedIfHasPermission($account, 'access content');
  }

  /**
   * {@inheritDoc}
   */
  public function build()
  {
    return array(
      '#markup'=> 'my weather block',
    );
  }


  /**
   * {@inheritdoc}
   */
  public function blockForm($form, FormStateInterface $form_state) {
    $form = parent::blockForm($form, $form_state);

    $config = $this->getConfiguration();


    $form['weather_API_key'] = [
      '#type' => 'textfield',
      '#title' => $this->t('API'),
      '#description' => $this->t('API key for the weather'),
      '#default_value' => isset($config['weather_API_key']) ? $config['weather_API_key'] : '',
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function blockSubmit($form, FormStateInterface $form_state) {
    parent::blockSubmit($form, $form_state);
    $values = $form_state->getValues();
    $this->configuration['weather_block_name'] = $values['weather_block_name'];
  }

  public function current_weather()
  {
    $config = $this->getConfiguration();
    $apiKey= $config['weather_API_key'];
    $node = Drupal::routeMatch()->getParameter('node');
    $city = $node->getTitle();

    $output = file_get_contents('https://api.openweathermap.org/data/2.5/weather?q='.$city.'&appid='.$apiKey);
    $data =  json_decode($output);
    //var_dump($data);

    return $data;
  }


  /**
   * {@inheritdoc}
   */
  public function getCacheMaxAge() {
    return 0;
  }

}


