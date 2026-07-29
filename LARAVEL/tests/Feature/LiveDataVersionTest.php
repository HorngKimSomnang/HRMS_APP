<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class LiveDataVersionTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_version_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/data-versions?resources=employees')
            ->assertUnauthorized();
    }

    public function test_successful_mutation_updates_only_affected_versions(): void
    {
        $user = User::factory()->create();

        $before = $this->actingAs($user, 'sanctum')
            ->getJson('/api/data-versions?resources=profile,employees,reports')
            ->assertOk()
            ->json();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile/update', ['name' => 'Updated Administrator'])
            ->assertOk();

        $after = $this->actingAs($user, 'sanctum')
            ->getJson('/api/data-versions?resources=profile,employees,reports')
            ->assertOk()
            ->json();

        $this->assertNotSame($before['global'], $after['global']);
        $this->assertNotSame($before['resources']['profile'], $after['resources']['profile']);
        $this->assertSame($before['resources']['employees'], $after['resources']['employees']);
        $this->assertSame($before['resources']['reports'], $after['resources']['reports']);
    }

    public function test_failed_mutation_does_not_update_versions(): void
    {
        $user = User::factory()->create();

        $before = $this->actingAs($user, 'sanctum')
            ->getJson('/api/data-versions?resources=profile')
            ->assertOk()
            ->json('resources.profile');

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile/update', ['email' => 'not-an-email'])
            ->assertUnprocessable();

        $after = $this->actingAs($user, 'sanctum')
            ->getJson('/api/data-versions?resources=profile')
            ->assertOk()
            ->json('resources.profile');

        $this->assertSame($before, $after);
    }
}
